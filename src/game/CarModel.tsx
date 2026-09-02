import { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { useLiveryStore, type LiveryPattern } from "./liveryStore";

const PATTERN_GLSL: Record<Exclude<LiveryPattern, "solid">, string> = {
  // two longitudinal racing stripes over the whole body
  stripes: "if (!(abs(nx) > 0.08 && abs(nx) < 0.32)) discard;",
  // side bands + nose flash
  rally: "if (!((abs(nx) > 0.5 && ny > 0.18 && ny < 0.62) || nz > 0.72)) discard;",
  // front half painted in the accent colour
  split: "if (nz < 0.02) discard;",
};

function makeOverlayMaterial(color: string, pattern: Exclude<LiveryPattern, "solid">, half: THREE.Vector3) {
  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(color),
    roughness: 0.45,
    metalness: 0.05,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace("void main() {", "varying vec3 vObjPos;\nvoid main() {")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvObjPos = position;");
    shader.fragmentShader = shader.fragmentShader
      .replace("void main() {", "varying vec3 vObjPos;\nvoid main() {")
      .replace(
        "#include <clipping_planes_fragment>",
        `#include <clipping_planes_fragment>
        float nx = vObjPos.x / ${half.x.toFixed(4)};
        float ny = vObjPos.y / ${(half.y * 2).toFixed(4)};
        float nz = vObjPos.z / ${half.z.toFixed(4)};
        ${PATTERN_GLSL[pattern]}`,
      );
  };
  return mat;
}

function numberTexture(text: string, bg: string, fg: string) {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, size, size);
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size * 0.44, 0, Math.PI * 2);
  ctx.fillStyle = bg;
  ctx.fill();
  ctx.lineWidth = size * 0.05;
  ctx.strokeStyle = fg;
  ctx.stroke();
  ctx.fillStyle = fg;
  ctx.font = `bold ${size * 0.6}px system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text || "0", size / 2, size * 0.54);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export function CarModel() {
  const { scene } = useGLTF("/models/race.glb");
  const body = useLiveryStore((s) => s.body);
  const accent = useLiveryStore((s) => s.accent);
  const pattern = useLiveryStore((s) => s.pattern);
  const number = useLiveryStore((s) => s.number);

  const { group } = useMemo(() => {
    const clone = scene.clone(true);
    const box = new THREE.Box3().setFromObject(clone);
    const size = box.getSize(new THREE.Vector3());
    const scale = 3.6 / Math.max(size.x, size.z);
    clone.scale.setScalar(scale);
    const box2 = new THREE.Box3().setFromObject(clone);
    const center = box2.getCenter(new THREE.Vector3());
    clone.position.sub(center);
    clone.position.y -= box2.min.y - center.y;

    const bodyMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(body),
      roughness: 0.4,
      metalness: 0.1,
    });
    const wheelMat = new THREE.MeshStandardMaterial({ color: "#17181c", roughness: 0.9 });

    let bodyMesh: THREE.Mesh | null = null;
    clone.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      const isWheel = mesh.name.toLowerCase().includes("wheel");
      mesh.material = isWheel ? wheelMat : bodyMat;
      if (!isWheel && !bodyMesh) bodyMesh = mesh;
    });

    const root = new THREE.Group();
    root.add(clone);

    const bm = bodyMesh as THREE.Mesh | null;
    if (bm) {
      bm.geometry.computeBoundingBox();
      const bb = bm.geometry.boundingBox!;
      const half = new THREE.Vector3(
        Math.max(Math.abs(bb.min.x), Math.abs(bb.max.x)),
        Math.max(bb.max.y, 0.001),
        Math.max(Math.abs(bb.min.z), Math.abs(bb.max.z)),
      );

      if (pattern !== "solid") {
        const overlay = new THREE.Mesh(bm.geometry, makeOverlayMaterial(accent, pattern, half));
        overlay.scale.setScalar(1.012);
        bm.add(overlay);
      }

      // number roundels on both sides, flush with the bodywork
      if (number) {
        const tex = numberTexture(number, accent, body);
        const planeMat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
        root.updateMatrixWorld(true);
        const wbb = new THREE.Box3().setFromObject(bm);
        const wSize = wbb.getSize(new THREE.Vector3());
        const wCenter = wbb.getCenter(new THREE.Vector3());
        const w = wSize.y * 0.55;
        const ray = new THREE.Raycaster();
        const yW = wbb.min.y + wSize.y * 0.42;
        for (const dir of [1, -1]) {
          const plane = new THREE.Mesh(new THREE.PlaneGeometry(w, w), planeMat);
          plane.rotation.y = dir * (Math.PI / 2);
          ray.set(
            new THREE.Vector3(wCenter.x + dir * wSize.x, yW, wCenter.z),
            new THREE.Vector3(-dir, 0, 0),
          );
          const hit = ray.intersectObject(bm, false)[0];
          if (hit) {
            const local = bm.worldToLocal(
              hit.point.clone().add(new THREE.Vector3(dir * 0.03, 0, 0)),
            );
            plane.position.copy(local);
          } else {
            plane.position.set(dir * half.x * 0.98, half.y * 0.45, 0);
          }
          bm.add(plane);
        }
      }
    }

    return { group: root };
  }, [scene, body, accent, pattern, number]);

  return <primitive object={group} />;
}

useGLTF.preload("/models/race.glb");
