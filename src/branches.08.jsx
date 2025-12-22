import { useMemo } from "react";
import { useLoader } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";

// Hook to load and extract mesh data from branch.081.glb
export function useBranch08() {
  const gltf = useLoader(GLTFLoader, "/src/assets/branch.081.glb");

  const meshes = useMemo(() => {
    const meshData = [];
    gltf.scene.traverse((child) => {
      if (child.isMesh && child.geometry) {
        const material = Array.isArray(child.material)
          ? child.material[0]
          : child.material;

        meshData.push({
          geometry: child.geometry,
          material: material,
          name: child.name,
        });
      }
    });
    return meshData;
  }, [gltf]);

  return meshes;
}

