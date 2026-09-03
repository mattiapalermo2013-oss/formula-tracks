import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { trackQuery, yawAt, type Track } from "./track";
import { useTrackStore } from "./trackStore";
import { useKeyboard } from "./useKeyboard";
import { useRaceStore } from "./store";
import { CarModel } from "./CarModel";

// Feel constants — tune these, not the model.
const ACCEL = 34;
const BRAKE = 26;
const DRAG = 0.25;
const TURN = 1.3;
const GRIP = 7.0;
const GRAVITY = -26;
const MAX_SPEED = 83.3; // ~300 km/h

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
  checkpoint: number;
  lapStart: number;
  elapsed: number;
  started: boolean;
  timerStarted: boolean;
}

function spawnAt(track: Track, index: number): Pick<VehicleState, "x" | "y" | "z" | "yaw"> {
  const s = track.samples[((index % track.count) + track.count) % track.count]!;
  return { x: s.pos.x, y: s.pos.y, z: s.pos.z, yaw: yawAt(track, index) };
}

export function Car({ groupRef }: { groupRef: React.RefObject<THREE.Group | null> }) {

  const leanRef = useRef<THREE.Group>(null);
  const keys = useKeyboard();
  const track = useTrackStore((s) => s.track);
  const trackRef = useRef(track);
  trackRef.current = track;

  const v = useRef<VehicleState>({
    ...spawnAt(track, 2),
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
    timerStarted: false,
  });
  const lastResetKey = useRef(false);
  const lastStoreSync = useRef(0);

  const phase = useRaceStore((s) => s.phase);
  useEffect(() => {
    const s = v.current;
    Object.assign(s, spawnAt(track, 2), {
      vx: 0, vz: 0, vy: 0, grounded: true, trackIdx: 2,
      lap: 1, checkpoint: 0, lapStart: 0, elapsed: 0,
      started: phase === "racing",
      timerStarted: false,
    });
  }, [phase, track]);

  useFrame((_, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05);
    const s = v.current;
    const trk = trackRef.current;
    const store = useRaceStore.getState();
    const k = keys.current;
    const racing = store.phase === "racing";

    const forward = racing
      ? (k.has("KeyW") || k.has("ArrowUp") ? 1 : 0) - (k.has("KeyS") || k.has("ArrowDown") ? 1 : 0)
      : 0;
    const steer = racing
      ? (k.has("KeyA") || k.has("ArrowLeft") ? 1 : 0) - (k.has("KeyD") || k.has("ArrowRight") ? 1 : 0)
      : 0;
    const braking = racing && k.has("Space");
    const resetPressed = k.has("KeyR");

    if (resetPressed && !lastResetKey.current && racing) {
      // Full reset: back to the start line, stopped, with the clock cleared.
      Object.assign(s, spawnAt(trk, 2), {
        vx: 0, vz: 0, vy: 0, grounded: true, trackIdx: 2,
        lap: 1, checkpoint: 0, lapStart: 0, elapsed: 0, timerStarted: false,
      });
      store.setTelemetry(0, 0);
    }
    lastResetKey.current = resetPressed;

    // The clock starts on the first throttle input, not at phase change.
    if (racing && !s.timerStarted && (forward > 0 || braking)) s.timerStarted = true;
    if (racing && s.timerStarted) s.elapsed += dt;

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

      const speedFactor = Math.min(Math.abs(vLong) / 12, 1) * (1 - 0.55 * Math.min(Math.abs(vLong) / MAX_SPEED, 1));
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

    const hit = trackQuery(trk, s.x, s.z, s.trackIdx);
    s.trackIdx = hit.index;
    if (hit.offTrack) {
      s.x += hit.pushX;
      s.z += hit.pushZ;
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

    if (s.grounded) {
      const climbRate = (hit.groundY - s.y) / Math.max(dt, 1e-4);
      if (hit.groundY < s.y - 0.25 && vLong > 6) {
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

    if (racing) {
      const nextCp = trk.checkpoints[s.checkpoint];
      if (nextCp !== undefined) {
        const prev = (s.trackIdx - 3 + trk.count) % trk.count;
        const crossed =
          (prev < nextCp && s.trackIdx >= nextCp) ||
          (nextCp < 20 && s.trackIdx >= nextCp && prev > trk.count - 20);
        if (crossed) s.checkpoint += 1;
      }
      if (s.trackIdx < 20 && s.checkpoint >= trk.checkpoints.length) {
        const lapTime = s.elapsed - s.lapStart;
        store.completeLap(lapTime);
        s.checkpoint = 0;
        store.finishRace(lapTime, lapTime);
        // respawn stationary on the start line
        Object.assign(s, spawnAt(trk, 2), {
          vx: 0, vz: 0, vy: 0, grounded: true, trackIdx: 2,
          lap: 1, checkpoint: 0, lapStart: 0, elapsed: 0,
          timerStarted: false,
        });
      }
      store.setProgress(s.lap, s.checkpoint);
    }

    const g = groupRef.current;
    if (g) {
      g.position.set(s.x, s.y, s.z);
      g.rotation.set(0, s.yaw, 0);
      g.userData['speed'] = Math.hypot(s.vx, s.vz);
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

    if (s.elapsed - lastStoreSync.current > 0.1 || !racing) {
      lastStoreSync.current = s.elapsed;
      store.setTelemetry(Math.round(Math.hypot(s.vx, s.vz) * 3.6), s.elapsed);
    }
  });

  return (
    <group ref={groupRef}>
      <group ref={leanRef}>
        <CarModel />
      </group>
    </group>
  );
}
