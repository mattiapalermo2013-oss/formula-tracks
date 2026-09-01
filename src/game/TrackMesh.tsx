import { useMemo } from "react";
import * as THREE from "three";
import { HALF_WIDTH, SAMPLE_COUNT, samples, seededRandom, distanceToTrack } from "./track";

function buildRibbon(halfWidth: number, yOffset: number) {
  const geom = new THREE.BufferGeometry();
  const n = SAMPLE_COUNT;
  const positions = new Float32Array(n * 2 * 3);
  const indices: number[] = [];

  for (let i = 0; i < n; i++) {
    const s = samples[i];
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

// Alternating curb blocks along both edges.
function buildCurbs(offsetSign: number, phase: number) {
  const dummy = new THREE.Object3D();
  const out: THREE.Matrix4[] = [];
  for (let i = phase; i < SAMPLE_COUNT; i += 8) {
    const s = samples[i];
    dummy.position.set(
      s.pos.x + s.right.x * HALF_WIDTH * offsetSign,
      s.pos.y + 0.12,
      s.pos.z + s.right.y * HALF_WIDTH * offsetSign,
    );
    dummy.rotation.set(0, Math.atan2(s.tangent.x, s.tangent.z), 0);
    dummy.updateMatrix();
    out.push(dummy.matrix.clone());
  }
  return out;
}

function Curbs({ sign, phase, color }: { sign: number; phase: number; color: string }) {
  const mats = useMemo(() => buildCurbs(sign, phase), [sign, phase]);
  return (
    <group>
      {mats.map((m, i) => {
        const p = new THREE.Vector3();
        const q = new THREE.Quaternion();
        const sc = new THREE.Vector3();
        m.decompose(p, q, sc);
        return (
          <mesh key={i} position={p} quaternion={q} castShadow receiveShadow>
            <boxGeometry args={[1.1, 0.28, 3.4]} />
            <meshStandardMaterial color={color} flatShading />
          </mesh>
        );
      })}
    </group>
  );
}

function Pillars() {
  const items = useMemo(() => {
    const out: { x: number; z: number; h: number; y: number }[] = [];
    for (let i = 0; i < SAMPLE_COUNT; i += 12) {
      const s = samples[i];
      if (s.pos.y > 0.8) out.push({ x: s.pos.x, z: s.pos.z, h: s.pos.y, y: s.pos.y / 2 });
    }
    return out;
  }, []);
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

function Scenery() {
  const props = useMemo(() => {
    const rand = seededRandom(1337);
    const trees: { x: number; z: number; s: number; kind: number }[] = [];
    let guard = 0;
    while (trees.length < 110 && guard < 4000) {
      guard++;
      const x = (rand() - 0.5) * 260;
      const z = (rand() - 0.5) * 260;
      const d = distanceToTrack(x, z);
      if (d < HALF_WIDTH + 5 || d > 60) continue;
      trees.push({ x, z, s: 0.7 + rand() * 0.9, kind: rand() > 0.72 ? 1 : 0 });
    }
    return trees;
  }, []);

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
          <mesh key={i} position={[t.x, 0.5 * t.s, t.z]} scale={t.s} rotation={[0.2, i, 0.1]} castShadow>
            <dodecahedronGeometry args={[1.1, 0]} />
            <meshStandardMaterial color="#9aa4ad" flatShading />
          </mesh>
        ),
      )}
    </group>
  );
}

function StartLine() {
  const s = samples[0];
  const yaw = Math.atan2(s.tangent.x, s.tangent.z);
  return (
    <group position={[s.pos.x, s.pos.y, s.pos.z]} rotation={[0, yaw, 0]}>
      <mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[HALF_WIDTH * 2, 2.4]} />
        <meshStandardMaterial color="#f2f4f7" flatShading />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * (HALF_WIDTH + 0.6), 3, 0]} castShadow>
          <boxGeometry args={[0.8, 6, 0.8]} />
          <meshStandardMaterial color="#e0483a" flatShading />
        </mesh>
      ))}
      <mesh position={[0, 6.2, 0]} castShadow>
        <boxGeometry args={[HALF_WIDTH * 2 + 2, 1.2, 0.7]} />
        <meshStandardMaterial color="#e0483a" flatShading />
      </mesh>
    </group>
  );
}

export function TrackMesh() {
  const road = useMemo(() => buildRibbon(HALF_WIDTH, 0.02), []);
  const shoulder = useMemo(() => buildRibbon(HALF_WIDTH + 1.4, -0.35), []);

  return (
    <group>
      <mesh geometry={shoulder} receiveShadow>
        <meshStandardMaterial color="#4b5259" flatShading side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={road} receiveShadow>
        <meshStandardMaterial color="#6f7a85" flatShading side={THREE.DoubleSide} />
      </mesh>
      <Curbs sign={1} phase={0} color="#e0483a" />
      <Curbs sign={1} phase={4} color="#f4f6f8" />
      <Curbs sign={-1} phase={0} color="#f4f6f8" />
      <Curbs sign={-1} phase={4} color="#e0483a" />
      <Pillars />
      <StartLine />
      <Scenery />
    </group>
  );
}
