import { useEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { useTrackStore } from "./trackStore";

export function EditorCamera() {
  const track = useTrackStore((s) => s.track);
  const camera = useThree((s) => s.camera);

  const { center, radius } = useMemo(() => {
    const box = new THREE.Box3();
    for (const s of track.samples) box.expandByPoint(s.pos);
    const c = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    return { center: c, radius: Math.max(size.x, size.z, 40) };
  }, [track]);

  useEffect(() => {
    const pc = camera as THREE.PerspectiveCamera;
    pc.fov = 55;
    pc.position.set(center.x, center.y + radius * 0.9, center.z - radius * 0.9);
    pc.lookAt(center);
    pc.updateProjectionMatrix();
  }, [camera, center, radius]);

  return (
    <OrbitControls
      target={[center.x, center.y, center.z]}
      enablePan
      maxPolarAngle={Math.PI / 2.1}
      minDistance={30}
      maxDistance={radius * 3}
    />
  );
}
