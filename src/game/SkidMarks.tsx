import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  MAX_SKIDS,
  skidGeometry,
  skidMaterial,
  skidState,
  markSkidsClean,
} from "./skidmarks";

export function SkidMarks() {
  const ref = useRef<THREE.InstancedMesh>(null);

  useEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    mesh.frustumCulled = false;
  }, []);

  useFrame(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const s = skidState();
    if (!s.dirty) return;
    mesh.instanceMatrix.array.set(s.matrices);
    mesh.instanceMatrix.needsUpdate = true;
    markSkidsClean();
  });

  return (
    <instancedMesh
      ref={ref}
      args={[skidGeometry, skidMaterial, MAX_SKIDS]}
      renderOrder={1}
    />
  );
}
