import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Suspense, useEffect } from "react";
import { useThree } from "@react-three/fiber";
import Branch from "./Branch";
import { Stem } from "./stem";
import EnvironmentBackground from "./EnvironmentBackground";
import { ReflectivePlatform } from "./ReflectivePlatform";
import { useEnvironmentMap } from "./GlassMaterials";
import "./style.css";

// Component to set environment map on the scene for lighting and reflections
function EnvironmentLighting() {
  const { scene } = useThree();
  const envMap = useEnvironmentMap("/colorful_studio_4k.hdr");

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

      {/* Plane at origin */}
      {/* <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[10, 10]} />
        <meshStandardMaterial color="#333333" />
      </mesh> */}

      {/* Environment Background */}
      {/* <Suspense fallback={null}>
        <EnvironmentBackground />
      </Suspense> */}

      {/* Models */}
      <Suspense fallback={null}>
        <Stem />
        <Branch />
      </Suspense>

      {/* Reflective Platform */}
      {/* <ReflectivePlatform size={80} position={[0, -0.7, 0]} receiveShadow /> */}

      {/* Camera Controls */}
      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={2}
        maxDistance={4}
      />
    </>
  );
}

// Main App component
function App() {
  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <Canvas
        camera={{ position: [0, 2, 5], fov: 75 }}
        gl={{ antialias: true }}
      >
        <Scene />
      </Canvas>
    </div>
  );
}

export default App;
