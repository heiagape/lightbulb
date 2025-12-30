import { Suspense, useEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, Environment } from "@react-three/drei";
import { ToneMappingMode } from "postprocessing";
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
      <ambientLight intensity={0.8} />
      <directionalLight position={[5, 5, 5]} intensity={1.2} />
      <directionalLight position={[-5, 5, -5]} intensity={0.8} />
      {/* Environment Map Lighting - provides environment lighting for all materials */}
      <Suspense fallback={null}>
        <EnvironmentLighting />
      </Suspense>

      {/* Black Background */}
      <color attach="background" args={["#171717"]} />

      {/* Three-Point Lighting Setup */}
      {/* Key Light - Main light source, positioned at 45 degrees front-right */}
      <directionalLight
        position={[5, 5, 5]}
        intensity={1.5}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />

      {/* Fill Light - Softer light, positioned opposite key light to fill shadows */}
      {/* <directionalLight position={[-4, 3, 4]} intensity={1} color="#ffffff" />/ */}

      {/* Rim/Back Light - Edge light positioned behind the subject */}
      {/* <directionalLight position={[0, 3, -6]} intensity={14} color="#ffffff" /> */}

      {/* Ambient light for overall scene illumination */}
      {/* <ambientLight intensity={100} /> */}

      {/* Lights - warm gold-tinted for chandelier effect */}
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

      {/* Post Processing - Conditional */}
      {postProcessing.enabled && (
        <EffectComposer>
          <Bloom
            luminanceThreshold={0.4}
            luminanceSmoothing={0.9}
            intensity={0.26}
            mipmapBlur
          />
          <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
        </EffectComposer>
      )}
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
