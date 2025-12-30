import { useLoader } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useMaterialType } from "./materialState";
import { useControls } from "leva";

// Hook to load the Stem.glb model
export function useStem() {
  const gltf = useLoader(GLTFLoader, "/assets/Stem.glb");
  return gltf;
}

// Stem component - loads and renders the central stem model
export function Stem() {
  const gltf = useStem();
  const materialTypeValue = useMaterialType();

  // Material color control (shared with Branch component via Leva panel)
  const materialControls = useControls("Material", {
    goldColor: {
      value: "#e2b42a",
      label: "Gold Color",
    },
  });

  // Create materials based on material type
  const blackMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: 0x000000,
      roughness: 0.4,
    });
  }, []);

  // Create metal material once, then update properties via useEffect
  const metalMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: 0xe2b42a, // Gold color (default)
      metalness: 0.7,
      roughness: 0.4,
    });
  }, []);

  // Update material properties when material type changes (without recreating the material)
  useEffect(() => {
    // Only update metalMaterial - never touch blackMaterial
    if (materialTypeValue === "Platinum") {
      // Update to platinum properties
      metalMaterial.color.set("#e5e4e2");
      metalMaterial.roughness = 0.01;
      metalMaterial.metalness = 1.0;
      metalMaterial.clearcoat = 0.3;
      metalMaterial.clearcoatRoughness = 0.1;
    } else {
      // Update to gold properties using the color from the GUI
      metalMaterial.color.set(materialControls.goldColor);
      metalMaterial.roughness = 0.4;
      metalMaterial.metalness = 0.7;
      metalMaterial.clearcoat = 0;
      metalMaterial.clearcoatRoughness = 0;
    }
    metalMaterial.needsUpdate = true;

    // Ensure blackMaterial always stays black (safety check)
    if (blackMaterial.color.getHex() !== 0x000000) {
      blackMaterial.color.set(0x000000);
      blackMaterial.needsUpdate = true;
    }
  }, [
    materialTypeValue,
    materialControls.goldColor,
    metalMaterial,
    blackMaterial,
  ]);

  // Change material colors based on mesh names
  // IMPORTANT: Re-run when material type changes to ensure meshes get updated materials
  useEffect(() => {
    gltf.scene.traverse((child) => {
      if (child.isMesh) {
        // Explicitly check for "17659" - it should ALWAYS get metal material (gold/platinum)
        const is17659 = child.name.includes("17659");
        const is17363 = child.name.includes("17363");

        // Debug: log mesh name if it contains "17659"
        if (is17659) {
          console.log(
            `Stem mesh "${child.name}" - ensuring it gets metal material, not black`
          );
        }

        // Check if it's a glass mesh
        const isGlassMesh =
          child.name.toLowerCase().includes("glass") ||
          child.name === "MET-59_3D-Model17661";

        // PRIORITY CHECK: Mesh 17659 ALWAYS gets metal material FIRST (regardless of other conditions)
        if (is17659 && !isGlassMesh) {
          child.material = metalMaterial;
        } else if (is17363 && !is17659) {
          // Only "17363" meshes (NOT "17659") get black material
          child.material = blackMaterial;
        } else if (!isGlassMesh) {
          // All other non-glass meshes get metal material (gold/platinum)
          child.material = metalMaterial;
        }
      }
    });
  }, [
    gltf,
    blackMaterial,
    metalMaterial,
    materialTypeValue,
    materialControls.goldColor,
  ]);

  return <primitive object={gltf.scene} />;
}
