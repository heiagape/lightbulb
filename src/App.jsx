import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Suspense } from "react";
import { useLoader } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import Branch from "./Branch";
import "./style.css";

// Stem component - loads the central stem model
function Stem() {
  const gltf = useLoader(GLTFLoader, "/src/assets/Stem.glb");

  return <primitive object={gltf.scene} />;
}

// Scene component containing all 3D elements
function Scene() {
  return (
    <>
      {/* Lights */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={1} />

      {/* Plane at origin */}
      {/* <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[10, 10]} />
        <meshStandardMaterial color="#333333" />
      </mesh> */}

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
        <color attach="background" args={["#1a1a1a"]} />
        <Scene />
      </Canvas>
    </div>
  );
}

export default App;
