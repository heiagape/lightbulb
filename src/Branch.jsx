import { useRef, useEffect, useMemo } from "react";
import { useLoader } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { useControls } from "leva";
import * as THREE from "three";

// Branch component - creates instanced meshes from multiple branch models
function Branch() {
  // Load all 8 branch models
  const branchGLTFs = useLoader(GLTFLoader, [
    "/src/assets/branch.011.glb",
    "/src/assets/branch.021.glb",
    "/src/assets/branch.031.glb",
    "/src/assets/branch.041.glb",
    "/src/assets/branch.051.glb",
    "/src/assets/branch.061.glb",
    "/src/assets/branch.071.glb",
    "/src/assets/branch.081.glb",
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
    tiltFoldX: {
      value: 0.3,
      min: 0,
      max: 4,
      step: 0.05,
      label: "Tilt Fold X",
    },
    tiltFoldY: {
      value: 0,
      min: 0,
      max: 4,
      step: 0.05,
      label: "Tilt Fold Y",
    },
    tiltFoldZ: {
      value: 0,
      min: 0,
      max: 4,
      step: 0.05,
      label: "Tilt Fold Z",
    },
    angleSpread: {
      value: 0,
      min: 0,
      max: 4,
      step: 0.05,
      label: "Angle Spread",
    },
    angleOffset: {
      value: 0,
      min: -Math.PI,
      max: Math.PI,
      step: 0.1,
      label: "Rotation Offset",
    },
    distanceInward: {
      value: 0,
      min: -5,
      max: 5,
      step: 0.01,
      label: "Distance Inward",
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
      const branchIndex = Math.floor(random(config.randomSeed + i) * 8);
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

          // Enhanced logging to debug material issues
          const materialInfo = {
            type: material?.type || "unknown",
            name: material?.name || "unnamed",
            color: material?.color
              ? `#${material.color.getHexString()}`
              : "no color",
            needsLight:
              material?.type?.includes("Standard") ||
              material?.type?.includes("Phong") ||
              material?.type?.includes("Lambert"),
            emissive: material?.emissive
              ? `#${material.emissive.getHexString()}`
              : "none",
          };

          console.log(
            `Branch ${branchIndex + 1}: Mesh "${child.name}"`,
            materialInfo
          );
        }
      });
      return meshes;
    });
    return allBranchData;
  }, [branchGLTFs]);

  // Count instances per branch type
  const instanceCounts = useMemo(() => {
    const counts = [0, 0, 0, 0, 0, 0, 0, 0];
    instanceAssignments.forEach((branchIndex) => {
      counts[branchIndex]++;
    });
    return counts;
  }, [instanceAssignments]);

  useEffect(() => {
    if (branchMeshData.length === 0) return;

    const dummy = new THREE.Object3D();

    // Track which instance of each branch type we're setting
    const branchInstanceIndices = [0, 0, 0, 0, 0, 0, 0, 0];

    let globalInstanceIndex = 0;

    // Create transformations for all instances
    for (let col = 0; col < config.columns; col++) {
      // Calculate fold spread for this column
      const spreadFactor =
        config.columns === 1 ? 0 : col / (config.columns - 1) - 0.5;

      const foldX = spreadFactor * config.tiltFoldX;
      const foldY = spreadFactor * config.tiltFoldY;
      const foldZ = spreadFactor * config.tiltFoldZ;
      const angleSpread = spreadFactor * config.angleSpread;

      // Middle columns get full angleOffset, top/bottom columns get less
      // middleFactor is 1 at center (spreadFactor=0), 0 at edges (spreadFactor=±0.5)
      const middleFactor = 1 - Math.abs(spreadFactor * 2);
      const columnAngleOffset = config.angleOffset * middleFactor;

      // Position instances in a circle for this column
      for (let i = 0; i < config.count; i++) {
        const angle = (i / config.count) * Math.PI * 2 + columnAngleOffset;

        // Calculate inward direction (perpendicular to radial)
        const inwardDir = new THREE.Vector3(
          Math.sin(angle),
          0,
          Math.cos(angle)
        );

        // Rotate the inward direction by foldY so folded columns still point toward [0,0,0]
        // The rotation axis needs to be perpendicular to inward direction (tangent to circle)
        // This ensures each branch tilts correctly toward center
        const rotationAxis = new THREE.Vector3(
          -Math.cos(angle),
          0,
          Math.sin(angle)
        );
        const foldYRotation = new THREE.Quaternion().setFromAxisAngle(
          rotationAxis,
          foldY
        );
        inwardDir.applyQuaternion(foldYRotation);

        // Position branches along the rotated inward direction
        dummy.position.set(
          inwardDir.x * config.distanceInward,
          inwardDir.y * config.distanceInward,
          inwardDir.z * config.distanceInward
        );

        // Apply rotations:
        // - Base rotation: Y = circular angle + angle spread, Z = base tilt + fold Z
        // - Fold X: perpendicular fold on X axis (up/down in tangent direction)
        // - Fold Y: perpendicular fold on Y axis (up/down in another direction)
        dummy.rotation.set(
          0,
          angle + angleSpread,
          Math.PI / 2 + config.tiltAngle + foldZ
        );
        dummy.updateMatrix();

        // Apply fold X and fold Y as additional local rotations using quaternions
        const baseQuaternion = new THREE.Quaternion().setFromEuler(
          dummy.rotation
        );
        const foldXQuaternion = new THREE.Quaternion().setFromAxisAngle(
          new THREE.Vector3(1, 0, 0),
          foldX
        );
        const foldYQuaternion = new THREE.Quaternion().setFromAxisAngle(
          new THREE.Vector3(0, 1, 0),
          foldY
        );

        // Combine: base * foldX * foldY
        baseQuaternion.multiply(foldXQuaternion).multiply(foldYQuaternion);
        dummy.quaternion.copy(baseQuaternion);

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
