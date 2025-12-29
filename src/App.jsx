import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Suspense } from "react";
import Branch from "./Branch";
import { Stem } from "./stem";
import EnvironmentBackground from "./EnvironmentBackground";
import { ReflectivePlatform } from "./ReflectivePlatform";
import "./style.css";

// Scene component containing all 3D elements
function Scene() {
  return (
    <>
      {/* Black Background */}
      <color attach="background" args={["#000000"]} />

      {/* Lights */}
      <ambientLight intensity={0.8} />
      <directionalLight position={[5, 5, 5]} intensity={1.2} />
      <directionalLight position={[-5, 5, -5]} intensity={0.8} />

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
      <ReflectivePlatform size={80} position={[0, -0.7, 0]} receiveShadow />

      {/* Camera Controls */}
      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={2}
        maxDistance={10}
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
