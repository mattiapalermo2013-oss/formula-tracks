import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import {
  CHECKPOINT_INDICES,
  LAPS_TO_WIN,
  SAMPLE_COUNT,
  samples,
  trackQuery,
  yawAt,
} from "./track";
import { useKeyboard } from "./useKeyboard";
import { useRaceStore } from "./store";

// Feel constants — tune these, not the model.
const ACCEL = 22;
const BRAKE = 26;
const DRAG = 0.9;
const TURN = 2.2;
const GRIP = 7.0;
const GRAVITY = -26;
const MAX_SPEED = 34;

interface VehicleState {
  x: number;
  y: number;
  z: number;
  vx: number;
  vz: number;
  vy: number;
  yaw: number;
  grounded: boolean;
  trackIdx: number;
  lap: number;
  checkpoint: number; // next checkpoint to hit (index into CHECKPOINT_INDICES)
  lapStart: number;
  elapsed: number;
  started: boolean;
}

function spawnAt(index: number): Pick<VehicleState, "x" | "y" | "z" | "yaw"> {
  const s = samples[((index % SAMPLE_COUNT) + SAMPLE_COUNT) % SAMPLE_COUNT];
  return { x: s.pos.x, y: s.pos.y, z: s.pos.z, yaw: yawAt(index) };
}

export function Car({ groupRef }: { groupRef: React.RefObject<THREE.Group | null> }) {
  const { scene } = useGLTF("/models/race.glb");
  const model = useMemo(() => {
    const clone = scene.clone(true);
    // Normalize: Kenney cars are ~2 units; scale to a readable size and center.
    const box = new THREE.Box3().setFromObject(clone);
    const size = box.getSize(new THREE.Vector3());
    const scale = 3.6 / Math.max(size.x, size.z);
    clone.scale.setScalar(scale);
    const box2 = new THREE.Box3().setFromObject(clone);
    const center = box2.getCenter(new THREE.Vector3());
    clone.position.sub(center);
    clone.position.y -= box2.min.y - center.y; // wheels on y=0 of the group
    clone.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) {
        (o as THREE.Mesh).castShadow = true;
      }
    });
    return clone;
  }, [scene]);

  const leanRef = useRef<THREE.Group>(null);
  const keys = useKeyboard();

  const v = useRef<VehicleState>({
    ...spawnAt(2),
    vx: 0,
    vz: 0,
    vy: 0,
    grounded: true,
    trackIdx: 2,
    lap: 1,
    checkpoint: 0,
    lapStart: 0,
    elapsed: 0,
    started: false,
  });
  const lastResetKey = useRef(false);
  const lastStoreSync = useRef(0);

  // Respawn when the race restarts.
  const phase = useRaceStore((s) => s.phase);
  useEffect(() => {
    if (phase === "racing") {
      const s = v.current;
      Object.assign(s, spawnAt(2), {
        vx: 0, vz: 0, vy: 0, grounded: true, trackIdx: 2,
        lap: 1, checkpoint: 0, lapStart: 0, elapsed: 0, started: true,
      });
    }
    if (phase === "ready") {
      const s = v.current;
      Object.assign(s, spawnAt(2), {
        vx: 0, vz: 0, vy: 0, grounded: true, trackIdx: 2,
        lap: 1, checkpoint: 0, lapStart: 0, elapsed: 0, started: false,
      });
    }
  }, [phase]);

  useFrame((_, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05);
    const s = v.current;
    const store = useRaceStore.getState();
    const k = keys.current;
    const racing = store.phase === "racing";

    // --- input
    const forward = racing
      ? (k.has("KeyW") || k.has("ArrowUp") ? 1 : 0) - (k.has("KeyS") || k.has("ArrowDown") ? 1 : 0)
      : 0;
    const steer = racing
      ? (k.has("KeyA") || k.has("ArrowLeft") ? 1 : 0) - (k.has("KeyD") || k.has("ArrowRight") ? 1 : 0)
      : 0;
    const braking = racing && k.has("Space");
    const resetPressed = k.has("KeyR");

    // --- reset to last checkpoint
    if (resetPressed && !lastResetKey.current && racing) {
      const cpIndex =
        s.checkpoint === 0 ? 0 : CHECKPOINT_INDICES[s.checkpoint - 1];
      Object.assign(s, spawnAt(cpIndex + 1), { vx: 0, vz: 0, vy: 0, grounded: true, trackIdx: cpIndex + 1 });
    }
    lastResetKey.current = resetPressed;

    if (racing) s.elapsed += dt;

    // --- arcade vehicle model (longitudinal / lateral decomposition)
    const fdx = Math.sin(s.yaw);
    const fdz = Math.cos(s.yaw);
    const rdx = Math.cos(s.yaw);
    const rdz = -Math.sin(s.yaw);

    let vLong = s.vx * fdx + s.vz * fdz;
    let vLat = s.vx * rdx + s.vz * rdz;

    if (s.grounded) {
      vLong += forward * ACCEL * dt;
      if (braking) vLong -= Math.sign(vLong) * BRAKE * dt;
      vLong -= vLong * DRAG * dt;
      vLong = THREE.MathUtils.clamp(vLong, -8, MAX_SPEED);

      const speedFactor = Math.min(Math.abs(vLong) / 9, 1);
      s.yaw += steer * TURN * speedFactor * (braking ? 1.4 : 1) * dt * Math.sign(vLong || 1);

      vLat *= Math.exp(-(braking ? 1.6 : GRIP) * dt);
    }

    const nfdx = Math.sin(s.yaw);
    const nfdz = Math.cos(s.yaw);
    const nrdx = Math.cos(s.yaw);
    const nrdz = -Math.sin(s.yaw);
    s.vx = nfdx * vLong + nrdx * vLat;
    s.vz = nfdz * vLong + nrdz * vLat;

    s.x += s.vx * dt;
    s.z += s.vz * dt;

    // --- track collision + ground height
    const hit = trackQuery(s.x, s.z, s.trackIdx);
    s.trackIdx = hit.index;
    if (hit.offTrack) {
      s.x += hit.pushX;
      s.z += hit.pushZ;
      // scrape: kill the velocity component pushing into the barrier
      const pushLen = Math.hypot(hit.pushX, hit.pushZ) || 1;
      const nx = hit.pushX / pushLen;
      const nz = hit.pushZ / pushLen;
      const into = s.vx * nx + s.vz * nz;
      if (into < 0) {
        s.vx -= nx * into;
        s.vz -= nz * into;
        s.vx *= 0.94;
        s.vz *= 0.94;
      }
    }

    // --- vertical: follow the road, launch off crests, gravity in the air
    if (s.grounded) {
      const climbRate = (hit.groundY - s.y) / Math.max(dt, 1e-4);
      if (hit.groundY < s.y - 0.25 && vLong > 6) {
        // ground fell away under a fast car — airborne, keep climb momentum
        s.grounded = false;
        s.vy = Math.max(climbRate, 0) * 0.9;
      } else {
        s.y = hit.groundY;
        s.vy = 0;
      }
    }
    if (!s.grounded) {
      s.vy += GRAVITY * dt;
      s.y += s.vy * dt;
      if (s.y <= hit.groundY) {
        s.y = hit.groundY;
        s.vy = 0;
        s.grounded = true;
      }
    }

    // --- checkpoints & laps
    if (racing) {
      const nextCp = CHECKPOINT_INDICES[s.checkpoint];
      if (nextCp !== undefined) {
        const prev = (s.trackIdx - 3 + SAMPLE_COUNT) % SAMPLE_COUNT;
        const crossed =
          (prev < nextCp && s.trackIdx >= nextCp) ||
          (nextCp < 20 && s.trackIdx >= nextCp && prev > SAMPLE_COUNT - 20);
        if (crossed) s.checkpoint += 1;
      }
      // lap line at index 0: wrapped from the end back to the start
      if (s.trackIdx < 20 && s.checkpoint >= CHECKPOINT_INDICES.length) {
        const lapTime = s.elapsed - s.lapStart;
        store.completeLap(lapTime);
        s.lapStart = s.elapsed;
        s.checkpoint = 0;
        if (s.lap >= LAPS_TO_WIN) {
          store.finishRace(s.elapsed, lapTime);
        } else {
          s.lap += 1;
        }
      }
      store.setProgress(s.lap, s.checkpoint);
    }

    // --- write to scene graph
    const g = groupRef.current;
    if (g) {
      g.position.set(s.x, s.y, s.z);
      g.rotation.set(0, s.yaw, 0);
      g.userData.speed = Math.hypot(s.vx, s.vz);
    }
    if (leanRef.current) {
      const speed = Math.hypot(s.vx, s.vz);
      const va = Math.atan2(s.vx, s.vz);
      const slip = speed > 0.5 ? Math.atan2(Math.sin(va - s.yaw), Math.cos(va - s.yaw)) : 0;
      const targetRoll = THREE.MathUtils.clamp(-slip * 0.25, -0.2, 0.2);
      leanRef.current.rotation.z += (targetRoll - leanRef.current.rotation.z) * (1 - Math.exp(-6 * dt));
      const targetPitch = s.grounded ? 0 : THREE.MathUtils.clamp(-s.vy * 0.02, -0.15, 0.25);
      leanRef.current.rotation.x += (targetPitch - leanRef.current.rotation.x) * (1 - Math.exp(-4 * dt));
    }

    // --- HUD sync (10 Hz is plenty)
    if (s.elapsed - lastStoreSync.current > 0.1 || !racing) {
      lastStoreSync.current = s.elapsed;
      store.setTelemetry(Math.round(Math.hypot(s.vx, s.vz) * 3.6), s.elapsed);
    }
  });

  return (
    <group ref={groupRef}>
      <group ref={leanRef}>
        <primitive object={model} />
      </group>
    </group>
  );
}

useGLTF.preload("/models/race.glb");
