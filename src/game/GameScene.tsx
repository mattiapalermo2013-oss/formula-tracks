import { Suspense, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import * as THREE from "three";
import { TrackMesh } from "./TrackMesh";
import { Car } from "./Car";
import { ChaseCamera } from "./ChaseCamera";

function Ground() {
  return (
    <>
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.5, 0]} receiveShadow>
        <planeGeometry args={[600, 600]} />
        <meshStandardMaterial color="#5f9e57" />
      </mesh>
      {/* distant low-poly hills */}
      {Array.from({ length: 16 }).map((_, i) => {
        const a = (i / 16) * Math.PI * 2;
        const r = 190 + ((i * 37) % 60);
        return (
          <mesh
            key={i}
            position={[Math.cos(a) * r, -0.5, Math.sin(a) * r]}
            rotation={[0, a, 0]}
            receiveShadow
          >
            <coneGeometry args={[40 + ((i * 13) % 25), 26 + ((i * 7) % 22), 5]} />
            <meshStandardMaterial color={i % 2 ? "#4d8a52" : "#578f63"} flatShading />
          </mesh>
        );
      })}
    </>
  );
}

export function GameScene() {
  const carRef = useRef<THREE.Group>(null);

  return (
    <Canvas
      shadows
      dpr={[1, 1.75]}
      camera={{ position: [0, 8, -18], fov: 62, near: 0.5, far: 800 }}
    >
      <color attach="background" args={["#8ec8f0"]} />
      <fog attach="fog" args={["#a8d6f2", 120, 420]} />

      <hemisphereLight args={["#cfe9ff", "#4b7a45", 0.75]} />
      <directionalLight
        position={[60, 90, 40]}
        intensity={2.1}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-120}
        shadow-camera-right={120}
        shadow-camera-top={120}
        shadow-camera-bottom={-120}
        shadow-camera-far={300}
      />

      <Environment>
        <Lightformer intensity={1.6} position={[0, 12, 0]} scale={[24, 24, 1]} />
        <Lightformer
          intensity={0.8}
          color="#9ec9ff"
          position={[-14, 3, -6]}
          rotation-y={Math.PI / 2}
          scale={[30, 4, 1]}
        />
      </Environment>

      <Ground />
      <TrackMesh />
      <Suspense fallback={null}>
        <Car groupRef={carRef} />
      </Suspense>
      <ChaseCamera targetRef={carRef} />
    </Canvas>
  );
}
