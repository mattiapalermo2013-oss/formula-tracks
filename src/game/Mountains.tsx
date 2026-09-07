import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { distanceToTrack, seededRandom, type Track } from "./track";
import { useTrackStore } from "./trackStore";

interface MountainInstance {
  matrix: THREE.Matrix4;
  shade: number;
}

const MAP_HALF = 300;
const EDGE_INSET = 24;
const TRACK_CLEARANCE = 34;
const MOUNTAIN_COUNT = 64;
const COLORS = ["#397f3f", "#4b9348", "#63a653"];

function mountainRing(track: Track): MountainInstance[] {
  const rand = seededRandom(90721);
  const items: MountainInstance[] = [];
  const dummy = new THREE.Object3D();

  for (let i = 0; i < MOUNTAIN_COUNT; i++) {
    const side = i % 4;
    const along = -MAP_HALF + 18 + rand() * (MAP_HALF * 2 - 36);
    const edge = MAP_HALF - EDGE_INSET - rand() * 22;
    const x = side < 2 ? along : (side === 2 ? -edge : edge);
    const z = side >= 2 ? along : (side === 0 ? -edge : edge);
    const radius = 8 + rand() * 10;

    // Include the mountain footprint in the safety margin, not just its centre.
    if (distanceToTrack(track, x, z) < TRACK_CLEARANCE + radius) continue;

    const height = 15 + rand() * 25;
    dummy.position.set(x, -0.5 + height / 2, z);
    dummy.rotation.set(0, rand() * Math.PI * 2, (rand() - 0.5) * 0.08);
    dummy.scale.set(radius, height, radius * (0.78 + rand() * 0.38));
    dummy.updateMatrix();
    items.push({ matrix: dummy.matrix.clone(), shade: Math.floor(rand() * COLORS.length) });
  }

  return items;
}

function MountainSet({ items, color }: { items: THREE.Matrix4[]; color: string }) {
  const ref = useRef<THREE.InstancedMesh>(null);

  useEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    items.forEach((matrix, index) => mesh.setMatrixAt(index, matrix));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [items]);

  if (items.length === 0) return null;
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, items.length]} receiveShadow>
      <coneGeometry args={[1, 1, 7, 3]} />
      <meshStandardMaterial color={color} roughness={0.95} flatShading />
    </instancedMesh>
  );
}

export function Mountains() {
  const track = useTrackStore((state) => state.track);
  const grouped = useMemo(() => {
    const groups: THREE.Matrix4[][] = COLORS.map(() => []);
    mountainRing(track).forEach(({ matrix, shade }) => groups[shade]?.push(matrix));
    return groups;
  }, [track]);

  return (
    <group>
      {grouped.map((items, index) => (
        <MountainSet key={COLORS[index]} items={items} color={COLORS[index] ?? COLORS[0]!} />
      ))}
    </group>
  );
}