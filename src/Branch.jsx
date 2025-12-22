import { useRef, useEffect, useMemo } from "react";
import { useLoader } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { useControls } from "leva";
import * as THREE from "three";

// Branch component - creates instanced meshes from multiple branch models
function Branch() {
  // Load all 7 branch models
  const branchGLTFs = useLoader(GLTFLoader, [
    "/src/assets/branch.01.glb",
    "/src/assets/branch.02.glb",
    "/src/assets/branch.03.glb",
    "/src/assets/branch.04.glb",
    "/src/assets/branch.05.glb",
    "/src/assets/branch.06.glb",
    "/src/assets/branch.07.glb",
  ]);

  const instancedMeshRefs = useRef({});

  // GUI controls for instancing configuration
  const config = useControls("Branch Chandelier", {
    count: { value: 8, min: 1, max: 20, step: 1, label: "Branch Count" },
    columns: { value: 1, min: 1, max: 10, step: 1, label: "Columns" },
    tiltAngle: {
      value: 0.145,
      min: -1,
      max: 1,
      step: 0.01,
      label: "Base Tilt",
    },
    tiltSpread: {
      value: 0.3,
      min: 0,
      max: 4,
      step: 0.05,
      label: "Tilt Spread",
    },
    angleOffset: {
      value: 0,
      min: -Math.PI,
      max: Math.PI,
      step: 0.1,
      label: "Rotation Offset",
    },
    randomSeed: { value: 1, min: 1, max: 100, step: 1, label: "Random Seed" },
  });

  // Calculate total instances and random assignments
  const { totalInstances, instanceAssignments } = useMemo(() => {
    const total = config.count * config.columns;
    const assignments = [];

    // Use seed for reproducible randomness
    const random = (seed) => {
      let x = Math.sin(seed++) * 10000;
      return x - Math.floor(x);
    };

    // Randomly assign each instance to a branch model
    for (let i = 0; i < total; i++) {
      const branchIndex = Math.floor(random(config.randomSeed + i) * 7);
      assignments.push(branchIndex);
    }

    return { totalInstances: total, instanceAssignments: assignments };
  }, [config.count, config.columns, config.randomSeed]);

  // Extract all meshes from all branch models
  const branchMeshData = useMemo(() => {
    const allBranchData = branchGLTFs.map((gltf, branchIndex) => {
      const meshes = [];
      gltf.scene.traverse((child) => {
        if (child.isMesh && child.geometry) {
          // Handle both single material and material arrays
          const material = Array.isArray(child.material)
            ? child.material[0]
            : child.material;

          meshes.push({
            geometry: child.geometry,
            material: material,
            name: child.name,
          });

          console.log(
            `Branch ${branchIndex + 1}: Found mesh "${
              child.name
            }" with material:`,
            material?.name || material?.type || "unknown"
          );
        }
      });
      return meshes;
    });
    return allBranchData;
  }, [branchGLTFs]);

  // Count instances per branch type
  const instanceCounts = useMemo(() => {
    const counts = [0, 0, 0, 0, 0, 0, 0];
    instanceAssignments.forEach((branchIndex) => {
      counts[branchIndex]++;
    });
    return counts;
  }, [instanceAssignments]);

  useEffect(() => {
    if (branchMeshData.length === 0) return;

    const dummy = new THREE.Object3D();

    // Track which instance of each branch type we're setting
    const branchInstanceIndices = [0, 0, 0, 0, 0, 0, 0];

    let globalInstanceIndex = 0;

    // Create transformations for all instances
    for (let col = 0; col < config.columns; col++) {
      // Calculate tilt for this column
      const tiltOffset =
        config.columns === 1
          ? 0
          : (col / (config.columns - 1) - 0.5) * config.tiltSpread;
      const columnTilt = config.tiltAngle + tiltOffset;

      // Position instances in a circle for this column
      for (let i = 0; i < config.count; i++) {
        const angle = (i / config.count) * Math.PI * 2 + config.angleOffset;

        // Keep all branches at origin (pivot point at 0,0,0)
        dummy.position.set(0, 0, 0);

        // Rotate around Y axis to spread in circle, with column-specific tilt
        dummy.rotation.set(0, angle, Math.PI / 2 + columnTilt);

        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();

        // Get which branch type this instance should use
        const branchIndex = instanceAssignments[globalInstanceIndex];
        const meshIndex = branchInstanceIndices[branchIndex];

        // Set the matrix for the appropriate branch type's instanced mesh
        const meshKey = `branch-${branchIndex}`;
        Object.keys(instancedMeshRefs.current).forEach((key) => {
          if (key.startsWith(meshKey)) {
            const instancedMesh = instancedMeshRefs.current[key];
            if (instancedMesh) {
              instancedMesh.setMatrixAt(meshIndex, dummy.matrix);
            }
          }
        });

        branchInstanceIndices[branchIndex]++;
        globalInstanceIndex++;
      }
    }

    // Update all instanced meshes
    Object.values(instancedMeshRefs.current).forEach((instancedMesh) => {
      if (instancedMesh) {
        instancedMesh.instanceMatrix.needsUpdate = true;
      }
    });
  }, [branchMeshData, config, instanceAssignments]);

  if (branchMeshData.length === 0) return null;

  return (
    <>
      {branchMeshData.map((meshes, branchIndex) => {
        const count = instanceCounts[branchIndex];
        if (count === 0) return null; // Skip if no instances for this branch

        return meshes.map((meshData, meshIndex) => (
          <instancedMesh
            key={`branch-${branchIndex}-mesh-${meshIndex}-${totalInstances}-${config.randomSeed}`}
            ref={(ref) => {
              instancedMeshRefs.current[
                `branch-${branchIndex}-mesh-${meshIndex}`
              ] = ref;
            }}
            args={[meshData.geometry, meshData.material, count]}
          />
        ));
      })}
    </>
  );
}

export default Branch;
