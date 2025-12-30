import { useLoader } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { useEffect } from "react";
import * as THREE from "three";

// Hook to load the Stem.glb model
export function useStem() {
  const gltf = useLoader(GLTFLoader, "/assets/Stem.glb");
  return gltf;
}

// Stem component - loads and renders the central stem model
export function Stem() {
  const gltf = useStem();

  // Change material colors based on mesh names
  useEffect(() => {
    const blackMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 });
    const goldMetalMaterial = new THREE.MeshStandardMaterial({
      color: 0xffde8b, // Light yellowish gold color
      metalness: 0.7,
      roughness: 0.4,
    });

    gltf.scene.traverse((child) => {
      if (child.isMesh) {
        if (child.name.includes("17363")) {
          child.material = blackMaterial;
        } else {
          // Apply gold metal to all other non-glass meshes
          // Check if it's not a glass mesh
          const isGlassMesh =
            child.name.toLowerCase().includes("glass") ||
            child.name === "MET-59_3D-Model17661";
          if (!isGlassMesh) {
            child.material = goldMetalMaterial;
          }
        }
      }
    });
  }, [gltf]);

  return <primitive object={gltf.scene} />;
}
