import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { HALF_WIDTH, distanceToTrack, pitExtensionAt, seededRandom, type Track } from "./track";
import { useTrackStore } from "./trackStore";

function buildRibbon(track: Track, extra: number, yOffset: number) {
  const geom = new THREE.BufferGeometry();
  const n = track.count;
  const positions = new Float32Array(n * 2 * 3);
  const indices: number[] = [];

  for (let i = 0; i < n; i++) {
    const s = track.samples[i]!;
    const rx = s.right.x * (s.half + extra);
    const rz = s.right.y * (s.half + extra);
    positions[i * 6 + 0] = s.pos.x - rx;
    positions[i * 6 + 1] = s.pos.y + yOffset;
    positions[i * 6 + 2] = s.pos.z - rz;
    positions[i * 6 + 3] = s.pos.x + rx;
    positions[i * 6 + 4] = s.pos.y + yOffset;
    positions[i * 6 + 5] = s.pos.z + rz;
  }
  for (let i = 0; i < n; i++) {
    const a = i * 2;
    const b = a + 1;
    const c = ((i + 1) % n) * 2;
    const d = c + 1;
    indices.push(a, c, b, b, c, d);
  }
  geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geom.setIndex(indices);
  geom.computeVertexNormals();
  return geom;
}

// --- Low barrier walls along both edges, alternating red / white segments.
const WALL_STEP = 3;
const WALL_HEIGHT = 0.9;

function buildWalls(track: Track) {
  const red: THREE.Matrix4[] = [];
  const white: THREE.Matrix4[] = [];
  const dummy = new THREE.Object3D();
  let block = 0;

  for (let i = 0; i < track.count; i += WALL_STEP) {
    const a = track.samples[i]!;
    const b = track.samples[(i + WALL_STEP) % track.count]!;
    block++;
    for (const sign of [-1, 1]) {
      // On the pit side the barrier moves out to the far edge of the lane.
      const ea = track.pit && sign === track.pit.side ? pitExtensionAt(track, i) : 0;
      const eb =
        track.pit && sign === track.pit.side
          ? pitExtensionAt(track, (i + WALL_STEP) % track.count)
          : 0;
      const ax = a.pos.x + a.right.x * (a.half + ea + 0.35) * sign;
      const az = a.pos.z + a.right.y * (a.half + ea + 0.35) * sign;
      const bx = b.pos.x + b.right.x * (b.half + eb + 0.35) * sign;
      const bz = b.pos.z + b.right.y * (b.half + eb + 0.35) * sign;
      const len = Math.hypot(bx - ax, bz - az) * 1.06;
      dummy.position.set((ax + bx) / 2, (a.pos.y + b.pos.y) / 2 + WALL_HEIGHT / 2, (az + bz) / 2);
      dummy.rotation.set(0, Math.atan2(bx - ax, bz - az), 0);
      dummy.scale.set(1, 1, Math.max(len, 0.2));
      dummy.updateMatrix();
      (block % 2 === 0 ? red : white).push(dummy.matrix.clone());
    }
  }
  return { red, white };
}

function WallSet({ mats, color }: { mats: THREE.Matrix4[]; color: string }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    mats.forEach((m, i) => mesh.setMatrixAt(i, m));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [mats]);
  if (!mats.length) return null;
  return (
    <instancedMesh
      key={mats.length}
      ref={ref}
      args={[undefined, undefined, mats.length]}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[0.55, WALL_HEIGHT, 1]} />
      <meshStandardMaterial color={color} flatShading />
    </instancedMesh>
  );
}

function Walls({ track }: { track: Track }) {
  const { red, white } = useMemo(() => buildWalls(track), [track]);
  return (
    <>
      <WallSet mats={red} color="#e0483a" />
      <WallSet mats={white} color="#f4f6f8" />
    </>
  );
}

function Pillars({ track }: { track: Track }) {
  const items = useMemo(() => {
    const out: { x: number; z: number; h: number; y: number }[] = [];
    for (let i = 0; i < track.count; i += 10) {
      const s = track.samples[i]!;
      if (s.pos.y > 1) out.push({ x: s.pos.x, z: s.pos.z, h: s.pos.y, y: s.pos.y / 2 });
    }
    return out;
  }, [track]);
  return (
    <group>
      {items.map((p, i) => (
        <mesh key={i} position={[p.x, p.y, p.z]} castShadow receiveShadow>
          <boxGeometry args={[2.2, p.h, 2.2]} />
          <meshStandardMaterial color="#b9c2cc" flatShading />
        </mesh>
      ))}
    </group>
  );
}

function Scenery({ track }: { track: Track }) {
  const props = useMemo(() => {
    const rand = seededRandom(1337);
    const trees: { x: number; z: number; s: number; kind: number }[] = [];
    let guard = 0;
    while (trees.length < 90 && guard < 4000) {
      guard++;
      const x = (rand() - 0.5) * 320;
      const z = (rand() - 0.5) * 320;
      const d = distanceToTrack(track, x, z);
      if (d < HALF_WIDTH + 6 || d > 60) continue;
      trees.push({ x, z, s: 0.7 + rand() * 0.9, kind: rand() > 0.72 ? 1 : 0 });
    }
    return trees;
  }, [track]);

  return (
    <group>
      {props.map((t, i) =>
        t.kind === 0 ? (
          <group key={i} position={[t.x, 0, t.z]} scale={t.s}>
            <mesh position={[0, 1, 0]} castShadow>
              <cylinderGeometry args={[0.28, 0.38, 2, 5]} />
              <meshStandardMaterial color="#7a5a3c" flatShading />
            </mesh>
            <mesh position={[0, 3.1, 0]} castShadow>
              <coneGeometry args={[1.6, 3.6, 6]} />
              <meshStandardMaterial color="#3f8f4f" flatShading />
            </mesh>
          </group>
        ) : (
          <mesh
            key={i}
            position={[t.x, 0.5 * t.s, t.z]}
            scale={t.s}
            rotation={[0.2, i, 0.1]}
            castShadow
          >
            <dodecahedronGeometry args={[1.1, 0]} />
            <meshStandardMaterial color="#9aa4ad" flatShading />
          </mesh>
        ),
      )}
    </group>
  );
}

function Gates({ track }: { track: Track }) {
  return (
    <group>
      {track.checkpoints.map((idx, i) => {
        const s = track.samples[idx % track.count]!;
        const yaw = Math.atan2(s.tangent.x, s.tangent.z);
        const w = s.half;
        return (
          <group key={i} position={[s.pos.x, s.pos.y, s.pos.z]} rotation={[0, yaw, 0]}>
            <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
              <planeGeometry args={[w * 2, 1.2]} />
              <meshStandardMaterial color="#3fa9e0" flatShading />
            </mesh>
            {[-1, 1].map((side) => (
              <mesh key={side} position={[side * (w + 0.9), 2.4, 0]} castShadow>
                <boxGeometry args={[0.6, 4.8, 0.6]} />
                <meshStandardMaterial color="#3fa9e0" flatShading />
              </mesh>
            ))}
            <mesh position={[0, 5, 0]} castShadow>
              <boxGeometry args={[w * 2 + 2.4, 0.9, 0.6]} />
              <meshStandardMaterial color="#3fa9e0" flatShading />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

function StartLine({ track }: { track: Track }) {
  const s = track.samples[0]!;
  const yaw = Math.atan2(s.tangent.x, s.tangent.z);
  const HW = s.half;
  return (
    <group position={[s.pos.x, s.pos.y, s.pos.z]} rotation={[0, yaw, 0]}>
      <mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[HW * 2, 2.4]} />
        <meshStandardMaterial color="#f2f4f7" flatShading />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * (HW + 1), 3, 0]} castShadow>
          <boxGeometry args={[0.8, 6, 0.8]} />
          <meshStandardMaterial color="#e0483a" flatShading />
        </mesh>
      ))}
      <mesh position={[0, 6.2, 0]} castShadow>
        <boxGeometry args={[HW * 2 + 2.6, 1.2, 0.7]} />
        <meshStandardMaterial color="#e0483a" flatShading />
      </mesh>
    </group>
  );
}


// --- Pit lane: asphalt strip, box marking and garages on the main straight.
function pitIndices(track: Track): number[] {
  const pit = track.pit;
  if (!pit) return [];
  const n = track.count;
  const span = (((pit.end - pit.start) % n) + n) % n;
  const out: number[] = [];
  for (let i = 0; i <= span; i++) out.push((pit.start + i) % n);
  return out;
}

function buildPitRibbon(track: Track) {
  const idx = pitIndices(track);
  const geom = new THREE.BufferGeometry();
  const positions = new Float32Array(idx.length * 6);
  const indices: number[] = [];
  const side = track.pit ? track.pit.side : 1;
  idx.forEach((j, i) => {
    const s = track.samples[j]!;
    const inner = s.half - 0.1;
    const outer = s.half + pitExtensionAt(track, j);
    positions[i * 6 + 0] = s.pos.x + s.right.x * inner * side;
    positions[i * 6 + 1] = s.pos.y + 0.03;
    positions[i * 6 + 2] = s.pos.z + s.right.y * inner * side;
    positions[i * 6 + 3] = s.pos.x + s.right.x * outer * side;
    positions[i * 6 + 4] = s.pos.y + 0.03;
    positions[i * 6 + 5] = s.pos.z + s.right.y * outer * side;
  });
  for (let i = 0; i < idx.length - 1; i++) {
    const a = i * 2;
    indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
  }
  geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geom.setIndex(indices);
  geom.computeVertexNormals();
  return geom;
}

function PitLane({ track }: { track: Track }) {
  const pit = track.pit;
  const ribbon = useMemo(() => (track.pit ? buildPitRibbon(track) : null), [track]);
  const garages = useMemo(() => {
    if (!pit) return [];
    const idx = pitIndices(track);
    const out: { x: number; y: number; z: number; yaw: number; color: string }[] = [];
    for (let i = 4; i < idx.length - 4; i += 6) {
      const j = idx[i]!;
      const s = track.samples[j]!;
      const off = s.half + pitExtensionAt(track, j) + 3.4;
      out.push({
        x: s.pos.x + s.right.x * off * pit.side,
        y: s.pos.y,
        z: s.pos.z + s.right.y * off * pit.side,
        yaw: Math.atan2(s.tangent.x, s.tangent.z),
        color: i % 12 === 4 ? "#d8dde3" : "#c2cad3",
      });
    }
    return out;
  }, [track]);

  if (!pit || !ribbon) return null;
  const boxSample = track.samples[pit.box]!;
  const boxOff = boxSample.half + pitExtensionAt(track, pit.box) * 0.55;

  return (
    <group>
      <mesh geometry={ribbon} receiveShadow>
        <meshStandardMaterial color="#8b939c" flatShading side={THREE.DoubleSide} />
      </mesh>
      {/* pit box marking */}
      <group
        position={[
          boxSample.pos.x + boxSample.right.x * boxOff * pit.side,
          boxSample.pos.y + 0.05,
          boxSample.pos.z + boxSample.right.y * boxOff * pit.side,
        ]}
        rotation={[0, Math.atan2(boxSample.tangent.x, boxSample.tangent.z), 0]}
      >
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[4.4, 7]} />
          <meshStandardMaterial color="#f2c53d" flatShading />
        </mesh>
        <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[3.4, 6]} />
          <meshStandardMaterial color="#4b5259" flatShading />
        </mesh>
      </group>
      {garages.map((g, i) => (
        <group key={i} position={[g.x, g.y, g.z]} rotation={[0, g.yaw, 0]}>
          <mesh position={[0, 2.1, 0]} castShadow receiveShadow>
            <boxGeometry args={[5.4, 4.2, 8]} />
            <meshStandardMaterial color={g.color} flatShading />
          </mesh>
          <mesh position={[-2.75, 1.6, 0]} castShadow>
            <boxGeometry args={[0.25, 3, 6]} />
            <meshStandardMaterial color="#e0483a" flatShading />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export function TrackMesh() {
  const track = useTrackStore((s) => s.track);
  const road = useMemo(() => buildRibbon(track, 0, 0.02), [track]);
  const shoulder = useMemo(() => buildRibbon(track, 1.4, -0.35), [track]);

  return (
    <group>
      <mesh geometry={shoulder} receiveShadow>
        <meshStandardMaterial color="#4b5259" flatShading side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={road} receiveShadow>
        <meshStandardMaterial color="#6f7a85" flatShading side={THREE.DoubleSide} />
      </mesh>
      <PitLane track={track} />
      <Walls track={track} />
      <Pillars track={track} />
      <StartLine track={track} />
      <Gates track={track} />
      <Scenery track={track} />
    </group>
  );
}
