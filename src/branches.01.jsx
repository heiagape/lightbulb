import { useMemo } from "react";
import { useLoader } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import * as THREE from "three";

// Hook to load and extract mesh data from branch.011.glb
export function useBranch01() {
  const gltf = useLoader(GLTFLoader, "/assets/branch.011.glb");

  const meshes = useMemo(() => {
    // Define group transformations - edit these values to transform all meshes as a group
    const rotation = new THREE.Euler(0, 0, 0); // Rotation in radians (x, y, z)
    const position = new THREE.Vector3(0, 0, 0); // Position offset (x, y, z)
    const scale = new THREE.Vector3(1, 2, 1); // Scale (x, y, z)

    // Create transformation matrix
    const matrix = new THREE.Matrix4();
    matrix.compose(
      position,
      new THREE.Quaternion().setFromEuler(rotation),
      scale
    );

    // Extract meshes and apply transformations to their geometries
    const meshData = [];
    gltf.scene.traverse((child) => {
      if (child.isMesh && child.geometry) {
        const material = Array.isArray(child.material)
          ? child.material[0]
          : child.material;

        // Clone the geometry to avoid mutating the original
        const clonedGeometry = child.geometry.clone();

        // Apply the transformation matrix to the geometry vertices
        clonedGeometry.applyMatrix4(matrix);

        // Update bounding box after transformation
        clonedGeometry.computeBoundingBox();

        meshData.push({
          geometry: clonedGeometry,
          material: material,
          name: child.name,
        });
      }
    });
    return meshData;
  }, [gltf]);

  return meshes;
}
