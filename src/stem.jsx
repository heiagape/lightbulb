import { useLoader } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";

// Hook to load the Stem.glb model
export function useStem() {
  const gltf = useLoader(GLTFLoader, "/assets/Stem.glb");
  return gltf;
}

// Stem component - loads and renders the central stem model
export function Stem() {
  const gltf = useStem();
  return <primitive object={gltf.scene} />;
}

