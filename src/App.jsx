import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment } from "@react-three/drei";
import {
  EffectComposer,
  Bloom,
  ToneMapping,
} from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import { Suspense } from "react";
import { useControls } from "leva";
import Branch from "./Branch";
import { Stem } from "./stem";
import "./style.css";

// Scene component containing all 3D elements
function Scene() {
  // Post-processing controls
  const postProcessing = useControls("Post Processing", {
    enabled: { value: true, label: "Enable Post Processing" },
  });

  return (
    <>
      {/* Very Dark Background */}
      <color attach="background" args={["#050507"]} />

      {/* Environment for realistic reflections */}
      <Environment files="/hdris/metro_noord_1k.hdr" />

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
