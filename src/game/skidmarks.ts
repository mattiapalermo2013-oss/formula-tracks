import * as THREE from "three";

// ---------------------------------------------------------------------------
// Skid marks: a ring buffer of dark quads laid on the asphalt while drifting.
// Cleared every time the car respawns on the start line (new run / reset).
// ---------------------------------------------------------------------------

export const MAX_SKIDS = 600;

const dummy = new THREE.Object3D();
const matrices = new Float32Array(MAX_SKIDS * 16);
const zero = new THREE.Matrix4().makeScale(0, 0, 0);

let head = 0;
let dirty = true;
let version = 0;

for (let i = 0; i < MAX_SKIDS; i++) {
  zero.toArray(matrices, i * 16);
}

export function pushSkid(x: number, y: number, z: number, yaw: number) {
  dummy.position.set(x, y + 0.04, z);
  dummy.rotation.set(0, yaw, 0);
  dummy.scale.set(1, 1, 1);
  dummy.updateMatrix();
  dummy.matrix.toArray(matrices, head * 16);
  head = (head + 1) % MAX_SKIDS;
  dirty = true;
}

export function clearSkids() {
  for (let i = 0; i < MAX_SKIDS; i++) {
    zero.toArray(matrices, i * 16);
  }
  head = 0;
  dirty = true;
  version++;
}

export function skidState() {
  return { matrices, dirty, version };
}

export function markSkidsClean() {
  dirty = false;
}

export const skidMaterial = new THREE.MeshBasicMaterial({
  color: "#1d2126",
  transparent: true,
  opacity: 0.55,
  depthWrite: false,
});

export const skidGeometry = new THREE.PlaneGeometry(0.34, 1.1);
skidGeometry.rotateX(-Math.PI / 2);
