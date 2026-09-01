import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { HALF_WIDTH, distanceToTrack, seededRandom, type Track } from "./track";
import { useTrackStore } from "./trackStore";

function buildRibbon(track: Track, halfWidth: number, yOffset: number) {
  const geom = new THREE.BufferGeometry();
  const n = track.count;
  const positions = new Float32Array(n * 2 * 3);
  const indices: number[] = [];

  for (let i = 0; i < n; i++) {
    const s = track.samples[i]!;
    const rx = s.right.x * halfWidth;
    const rz = s.right.y * halfWidth;
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
      const ax = a.pos.x + a.right.x * (HALF_WIDTH + 0.35) * sign;
      const az = a.pos.z + a.right.y * (HALF_WIDTH + 0.35) * sign;
      const bx = b.pos.x + b.right.x * (HALF_WIDTH + 0.35) * sign;
      const bz = b.pos.z + b.right.y * (HALF_WIDTH + 0.35) * sign;
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

function StartLine({ track }: { track: Track }) {
  const s = track.samples[0]!;
  const yaw = Math.atan2(s.tangent.x, s.tangent.z);
  return (
    <group position={[s.pos.x, s.pos.y, s.pos.z]} rotation={[0, yaw, 0]}>
      <mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[HALF_WIDTH * 2, 2.4]} />
        <meshStandardMaterial color="#f2f4f7" flatShading />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * (HALF_WIDTH + 1), 3, 0]} castShadow>
          <boxGeometry args={[0.8, 6, 0.8]} />
          <meshStandardMaterial color="#e0483a" flatShading />
        </mesh>
      ))}
      <mesh position={[0, 6.2, 0]} castShadow>
        <boxGeometry args={[HALF_WIDTH * 2 + 2.6, 1.2, 0.7]} />
        <meshStandardMaterial color="#e0483a" flatShading />
      </mesh>
    </group>
  );
}

export function TrackMesh() {
  const track = useTrackStore((s) => s.track);
  const road = useMemo(() => buildRibbon(track, HALF_WIDTH, 0.02), [track]);
  const shoulder = useMemo(() => buildRibbon(track, HALF_WIDTH + 1.4, -0.35), [track]);

  return (
    <group>
      <mesh geometry={shoulder} receiveShadow>
        <meshStandardMaterial color="#4b5259" flatShading side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={road} receiveShadow>
        <meshStandardMaterial color="#6f7a85" flatShading side={THREE.DoubleSide} />
      </mesh>
      <Walls track={track} />
      <Pillars track={track} />
      <StartLine track={track} />
      <Scenery track={track} />
    </group>
  );
}
