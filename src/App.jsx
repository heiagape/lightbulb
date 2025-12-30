import { Suspense, useEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, Environment } from "@react-three/drei";
import { ToneMappingMode } from "postprocessing";
import * as THREE from "three";
import {
  EffectComposer,
  Bloom,
  ToneMapping,
} from "@react-three/postprocessing";
import { useControls } from "leva";
import Branch from "./Branch";
import { Stem } from "./stem";
import EnvironmentBackground from "./EnvironmentBackground";
import { ReflectivePlatform } from "./ReflectivePlatform";
import { useEnvironmentMap } from "./GlassMaterials";
import "./style.css";

// Component to set environment map on the scene for lighting and reflections
function EnvironmentLighting() {
  const { scene } = useThree();
  const envMap = useEnvironmentMap("/hdris/metro_noord_1k.hdr");

  useEffect(() => {
    if (envMap) {
      // Set environment map for lighting and reflections on all materials
      scene.environment = envMap;
    }
    return () => {
      scene.environment = null;
    };
  }, [scene, envMap]);

  return null;
}

// Scene component containing all 3D elements
function Scene() {
  // Post-processing controls
  const postProcessing = useControls("Post Processing", {
    enabled: { value: true, label: "Enable Post Processing" },
  });

  return (
    <>
      {/* Environment Map Lighting - provides environment lighting for all materials */}
      <Suspense fallback={null}>
        <EnvironmentLighting />
      </Suspense>

      {/* Grey Background - rendered as mesh to work with postprocessing */}
      {/* Color is brighter to compensate for ToneMapping darkening */}
      <Suspense fallback={null}>
        <mesh>
          <sphereGeometry args={[500, 32, 32]} />
          <meshBasicMaterial
            color="#2a2a2a"
            side={THREE.BackSide}
            depthWrite={false}
          />
        </mesh>
      </Suspense>

      <ambientLight intensity={0.3} color="#1a1a1a" />
      <directionalLight position={[5, 5, 5]} intensity={1.5} color="#fff5e6" />
      <directionalLight
        position={[-5, 5, -5]}
        intensity={1.0}
        color="#ffe4c4"
      />
      <pointLight
        position={[0, 2, 0]}
        intensity={0.8}
        color="#ffd700"
        distance={10}
      />

      {/* Top-left reflection light - invisible but provides reflection basis */}
      <directionalLight
        position={[-8, 10, 3]}
        intensity={2.0}
        color="#ffffff"
      />

      {/* Models */}
      <Suspense fallback={null}>
        <Stem />
        <Branch />
      </Suspense>

      {/* Camera Controls */}
      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={2}
        maxDistance={4}
        maxPolarAngle={Math.PI / 2}
      />

      {/* Post Processing - Always render composer to prevent accumulation issues */}
      <EffectComposer>
        {postProcessing.enabled && (
          <>
            <Bloom
              luminanceThreshold={0.9}
              luminanceSmoothing={0.9}
              intensity={0.07}
              mipmapBlur
            />
            <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
          </>
        )}
      </EffectComposer>
    </>
  );
}

// Main App component
function App() {
  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        background: "linear-gradient(to bottom right, #0a0a0c, #15151a)",
      }}
    >
      <Canvas
        camera={{ position: [2, 2, 2], fov: 75 }}
        gl={{
          antialias: true,
          toneMapping: 0,
          powerPreference: "high-performance",
        }}
      >
        <Scene />
      </Canvas>
    </div>
  );
}

export default App;
