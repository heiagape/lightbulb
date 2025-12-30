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
      <ambientLight intensity={1.0} />
      <directionalLight position={[5, 5, 5]} intensity={1.5} />
      <directionalLight position={[-5, 5, -5]} intensity={1.0} />

      {/* Point light at the center of the chandelier (simulating lightbulb) */}
      <pointLight
        position={[0, 0, 0]}
        intensity={2.0}
        distance={10}
        decay={2}
        color="#ffffff"
      />

      {/* Spotlight from above to illuminate the chandelier */}
      <spotLight
        position={[0, 5, 0]}
        angle={Math.PI / 3}
        penumbra={0.5}
        intensity={1.5}
        castShadow
        color="#ffffff"
      />

      {/* Additional point lights for better illumination */}
      <pointLight
        position={[3, 2, 3]}
        intensity={1.0}
        distance={8}
        decay={2}
        color="#ffffff"
      />
      <pointLight
        position={[-3, 2, -3]}
        intensity={1.0}
        distance={8}
        decay={2}
        color="#ffffff"
      />

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
        minDistance={2.5}
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
        camera={{ position: [0, 2, 3], fov: 75 }}
        gl={{ antialias: true }}
        shadows
      >
        <Scene />
      </Canvas>
    </div>
  );
}

export default App;
