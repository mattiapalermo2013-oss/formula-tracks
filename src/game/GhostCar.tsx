import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { ghostClock, ghostSample, type GhostFrame } from "./ghost";
import { useRaceStore } from "./store";

/** Semi-transparent replay of the player's fastest lap. */
export function GhostCar() {
  const { scene } = useGLTF("/models/race.glb");
  const groupRef = useRef<THREE.Group>(null);
  const pose = useRef<GhostFrame>({ t: 0, x: 0, y: 0, z: 0, yaw: 0 });

  const model = useMemo(() => {
    const clone = scene.clone(true);
    const box = new THREE.Box3().setFromObject(clone);
    const size = box.getSize(new THREE.Vector3());
    clone.scale.setScalar(3.6 / Math.max(size.x, size.z));
    const box2 = new THREE.Box3().setFromObject(clone);
    clone.position.y -= box2.min.y;
    clone.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      mesh.material = new THREE.MeshStandardMaterial({
        color: new THREE.Color("#7fd4ff"),
        emissive: new THREE.Color("#1d5f7a"),
        emissiveIntensity: 0.6,
        transparent: true,
        opacity: 0.35,
        depthWrite: false,
        roughness: 0.4,
        metalness: 0,
      });
    });
    return clone;
  }, [scene]);

  useFrame(() => {
    const g = groupRef.current;
    if (!g) return;
    const racing = useRaceStore.getState().phase === "racing";
    const ok = racing && ghostSample(ghostClock.t, pose.current);
    g.visible = ok;
    if (!ok) return;
    g.position.set(pose.current.x, pose.current.y, pose.current.z);
    g.rotation.set(0, pose.current.yaw, 0);
  });

  return (
    <group ref={groupRef} visible={false}>
      <primitive object={model} />
    </group>
  );
}
