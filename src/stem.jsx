import { useLoader } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useMaterialType } from "./materialState";

// Hook to load the Stem.glb model
export function useStem() {
  const gltf = useLoader(GLTFLoader, "/assets/Stem.glb");
  return gltf;
}

// Stem component - loads and renders the central stem model
export function Stem() {
  const gltf = useStem();
  const materialTypeValue = useMaterialType();

  // Create materials based on material type
  const blackMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({ color: 0x000000 });
  }, []);

  // Create metal material once, then update properties via useEffect
  const metalMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: 0xffde8b, // Light yellowish gold color (default)
      metalness: 0.7,
      roughness: 0.4,
    });
  }, []);

  // Update material properties when material type changes (without recreating the material)
  useEffect(() => {
    if (materialTypeValue === "Platinum") {
      // Update to platinum properties
      metalMaterial.color.set("#e5e4e2");
      metalMaterial.roughness = 0.01;
      metalMaterial.metalness = 1.0;
      metalMaterial.clearcoat = 0.3;
      metalMaterial.clearcoatRoughness = 0.1;
    } else {
      // Update to gold properties
      metalMaterial.color.set(0xffde8b);
      metalMaterial.roughness = 0.4;
      metalMaterial.metalness = 0.7;
      metalMaterial.clearcoat = 0;
      metalMaterial.clearcoatRoughness = 0;
    }
    metalMaterial.needsUpdate = true;
  }, [materialTypeValue, metalMaterial]);

  // Change material colors based on mesh names
  useEffect(() => {
    gltf.scene.traverse((child) => {
      if (child.isMesh) {
        if (child.name.includes("17363")) {
          child.material = blackMaterial;
        } else {
          // Apply metal material to all other non-glass meshes
          // Check if it's not a glass mesh
          const isGlassMesh =
            child.name.toLowerCase().includes("glass") ||
            child.name === "MET-59_3D-Model17661";
          if (!isGlassMesh) {
            child.material = metalMaterial;
          }
        }
      }
    });
  }, [gltf, blackMaterial, metalMaterial]);

  return <primitive object={gltf.scene} />;
}
