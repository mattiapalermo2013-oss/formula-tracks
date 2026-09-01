import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { RefObject } from "react";

const OFFSET = new THREE.Vector3(0, 4.6, -9.5);
const LOOK = new THREE.Vector3(0, 1.6, 8);

export function ChaseCamera({ targetRef }: { targetRef: RefObject<THREE.Group | null> }) {
  const pos = useRef(new THREE.Vector3(0, 8, -16));
  const look = useRef(new THREE.Vector3());
  const tmp = useRef(new THREE.Vector3());
  const tmpLook = useRef(new THREE.Vector3());

  useFrame(({ camera }, delta) => {
    const target = targetRef.current;
    if (!target) return;
    const t = 1 - Math.exp(-4.5 * delta);

    tmp.current.copy(OFFSET).applyQuaternion(target.quaternion).add(target.position);
    pos.current.lerp(tmp.current, t);
    camera.position.copy(pos.current);

    tmpLook.current.copy(LOOK).applyQuaternion(target.quaternion).add(target.position);
    look.current.lerp(tmpLook.current, t);
    camera.lookAt(look.current);

    // speed-based FOV kick
    const speed = target.userData['speed'] ?? 0;
    const pc = camera as THREE.PerspectiveCamera;
    const targetFov = 62 + Math.min(speed / 83.3, 1) * 18;
    pc.fov += (targetFov - pc.fov) * (1 - Math.exp(-3 * delta));
    pc.updateProjectionMatrix();
  });

  return null;
}
