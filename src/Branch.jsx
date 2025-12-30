import { useRef, useEffect, useMemo } from "react";
import { useLoader, useFrame } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { useControls } from "leva";
import * as THREE from "three";
import { MiracleGlass } from "./GlassMaterials";

// Branch component - creates instanced meshes from multiple branch models
function Branch() {
  // Load all 8 branch models (using "b" versions except for branch 6)
  const branchGLTFs = useLoader(GLTFLoader, [
    "/assets/branch.011_b.glb",
    "/assets/branch.021_b.glb",
    "/assets/branch.031_b.glb",
    "/assets/branch.041_b.glb",
    "/assets/branch.051_b.glb",
    "/assets/branch.061.glb", // No "b" version available, keeping original
    "/assets/branch.071.glb", // Branch 6 - keeping original as requested
    "/assets/branch.081_b.glb",
  ]);

  const instancedMeshRefs = useRef({});
  const groupRef = useRef();

  // GUI controls for instancing configuration
  const config = useControls("Branch Chandelier", {
    count: { value: 15, min: 13, max: 20, step: 1, label: "Branch Count" },
    columns: { value: 7, min: 6, max: 10, step: 1, label: "Columns" },
    tiltFoldY: {
      value: 1.75,
      min: 0,
      max: 4,
      step: 0.05,
      label: "Tilt Fold Y",
    },
    overallFold: {
      value: 0.0,
      min: -0.2,
      max: 0.2,
      step: 0.01,
      label: "Overall Fold",
    },
    angleOffset: {
      value: 1.6,
      min: -Math.PI,
      max: Math.PI,
      step: 0.1,
      label: "Rotation Offset",
    },
    distanceOut: {
      value: 0.07,
      min: -0.05,
      max: 0.2,
      step: 0.001,
      label: "Distance Out",
    },
    randomSeed: { value: 80, min: 1, max: 100, step: 1, label: "Random Seed" },
    autoRotate: { value: true, label: "Auto Rotate" },
  });

  // Hidden config values (not in GUI)
  const hiddenConfig = {
    tiltAngle: 0.0,
    tiltFoldX: 0.0,
    tiltFoldZ: 0.0,
    angleSpread: 0.0,
  };

  // Calculate total instances and random assignments
  const { totalInstances, instanceAssignments } = useMemo(() => {
    const total = config.count * config.columns;
    const assignments = new Array(total).fill(-1); // Initialize with -1 (unassigned)

    // Use seed for reproducible randomness
    const random = (seed) => {
      let x = Math.sin(seed++) * 10000;
      return x - Math.floor(x);
    };

    // Determine center column and column positions
    const centerColumn = Math.floor(config.columns / 2);
    const topColumn = 0; // Top column (0-indexed)
    const bottomColumn = config.columns - 1; // Bottom column
    const secondTopColumn = 1; // Second column from top (0-indexed)
    const secondBottomColumn = config.columns - 2; // Second column from bottom

    // Long branches are branch07 (index 6) and branch08 (index 7)
    const longBranchIndices = [6, 7];
    // Regular branches are indices 0-5
    const regularBranchIndices = [0, 1, 2, 3, 4, 5];

    // Helper function to get position from global index
    const getPosition = (globalIndex) => {
      const col = Math.floor(globalIndex / config.count);
      const row = globalIndex % config.count;
      return { col, row };
    };

    // Helper function to calculate distance between two positions
    const getDistance = (pos1, pos2) => {
      const colDiff = Math.abs(pos1.col - pos2.col);
      const rowDiff = Math.abs(pos1.row - pos2.row);
      // Use Manhattan distance, but weight column distance more to prevent horizontal clustering
      return colDiff * 1.5 + rowDiff;
    };

    // Helper function to check if position has nearby short branches
    const hasNearbyShortBranches = (pos, minDistance = 2) => {
      for (let i = 0; i < assignments.length; i++) {
        if (assignments[i] === -1) continue; // Skip unassigned
        if (assignments[i] >= 6) continue; // Skip long branches

        const otherPos = getPosition(i);
        const distance = getDistance(pos, otherPos);
        if (distance < minDistance) {
          return true;
        }
      }
      return false;
    };

    // Step 1: First assign all long branches with proper spacing
    for (let col = 0; col < config.columns; col++) {
      const isTopOrBottom = col === topColumn || col === bottomColumn;
      const isCenterColumn = col === centerColumn;
      const isColumnAboveCenter = col === centerColumn - 1;
      const isSecondTopToCenter = col > secondTopColumn && col < centerColumn;
      const isCenterToSecondBottom =
        col > centerColumn && col < secondBottomColumn;

      // Determine interval pattern for this column
      let longBranchCounter = 0;
      let nextLongBranchAt = 0;

      if (isTopOrBottom) {
        // Top and bottom columns: every 3-4 branches
        nextLongBranchAt =
          Math.floor(random(config.randomSeed + col * 100) * 2) + 3;
      } else if (isCenterColumn || isColumnAboveCenter) {
        // Center column and column above center: every 1-2 branches (most frequent)
        nextLongBranchAt =
          Math.floor(random(config.randomSeed + col * 100) * 2) + 1;
      } else if (isSecondTopToCenter || isCenterToSecondBottom) {
        // From second top to center (excluding center): every 2-3 branches
        nextLongBranchAt =
          Math.floor(random(config.randomSeed + col * 100) * 2) + 2;
      } else {
        // Second top and second bottom columns: every 2-3 branches
        nextLongBranchAt =
          Math.floor(random(config.randomSeed + col * 100) * 2) + 2;
      }

      for (let i = 0; i < config.count; i++) {
        const globalIndex = col * config.count + i;

        // Check if this should be a long branch
        const shouldBeLong = longBranchCounter >= nextLongBranchAt;

        if (shouldBeLong) {
          // Assign long branch (branch07 or branch08)
          assignments[globalIndex] =
            longBranchIndices[
              Math.floor(
                random(config.randomSeed + globalIndex) *
                  longBranchIndices.length
              )
            ];
          // Reset counter and set next interval
          longBranchCounter = 0;
          if (isTopOrBottom) {
            // Top and bottom: every 3-4 branches
            nextLongBranchAt =
              Math.floor(random(config.randomSeed + globalIndex) * 2) + 3;
          } else if (isCenterColumn || isColumnAboveCenter) {
            // Center and column above center: every 1-2 branches
            nextLongBranchAt =
              Math.floor(random(config.randomSeed + globalIndex) * 2) + 1;
          } else {
            // Second top to center (excluding center): every 2-3 branches
            nextLongBranchAt =
              Math.floor(random(config.randomSeed + globalIndex) * 2) + 2;
          }
        }

        longBranchCounter++;
      }
    }

    // Step 2: Fill remaining positions with short branches, ensuring spatial distribution
    // Create a list of all unassigned positions
    const unassignedPositions = [];
    for (let i = 0; i < total; i++) {
      if (assignments[i] === -1) {
        unassignedPositions.push(i);
      }
    }

    // Sort unassigned positions by a score that prioritizes positions
    // that are far from existing short branches
    const scorePosition = (globalIndex) => {
      const pos = getPosition(globalIndex);
      let score = 0;

      // Check all assigned short branches and calculate distance
      for (let i = 0; i < assignments.length; i++) {
        if (assignments[i] === -1 || assignments[i] >= 6) continue;

        const otherPos = getPosition(i);
        const distance = getDistance(pos, otherPos);
        // Higher score for positions further from existing short branches
        score += distance;
      }

      return score;
    };

    // Sort by score (highest first - positions far from short branches)
    unassignedPositions.sort((a, b) => {
      return scorePosition(b) - scorePosition(a);
    });

    // Assign short branches, prioritizing positions that are far from existing ones
    for (const globalIndex of unassignedPositions) {
      const pos = getPosition(globalIndex);

      // Check distance to nearest short branch
      const minDistance = 2.5; // Minimum preferred distance between short branches
      const hasNearby = hasNearbyShortBranches(pos, minDistance);

      if (hasNearby) {
        // If there are nearby short branches, we still need to assign something
        // but we'll use a weighted random selection that favors longer branches
        // This helps break up clusters by occasionally using slightly longer regular branches
        // For now, just assign randomly - the spatial sorting already helps
        assignments[globalIndex] =
          regularBranchIndices[
            Math.floor(
              random(config.randomSeed + globalIndex) *
                regularBranchIndices.length
            )
          ];
      } else {
        // No nearby short branches, safe to place one here
        assignments[globalIndex] =
          regularBranchIndices[
            Math.floor(
              random(config.randomSeed + globalIndex) *
                regularBranchIndices.length
            )
          ];
      }
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

  // Create black material for meshes with "17363" in their name
  const blackMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({ color: 0x000000 });
  }, []);

  // Create subtle gold metal material for non-glass, non-17363 meshes
  const goldMetalMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: 0xffde8b, // Light yellowish gold color
      metalness: 1,
      roughness: 0.1,
    });
  }, []);

  useEffect(() => {
    if (branchMeshData.length === 0) return;

    const dummy = new THREE.Object3D();

    // Track which instance of each branch type we're setting
    const branchInstanceIndices = [0, 0, 0, 0, 0, 0, 0, 0];

    let globalInstanceIndex = 0;

    // Use seed for reproducible randomness
    const random = (seed) => {
      let x = Math.sin(seed++) * 10000;
      return x - Math.floor(x);
    };

    // Create transformations for all instances
    for (let col = 0; col < config.columns; col++) {
      // Calculate fold spread for this column
      const spreadFactor =
        config.columns === 1 ? 0 : col / (config.columns - 1) - 0.5;

      const foldX = spreadFactor * hiddenConfig.tiltFoldX;
      const foldY = spreadFactor * config.tiltFoldY;
      const foldZ = spreadFactor * hiddenConfig.tiltFoldZ;
      const angleSpread = spreadFactor * hiddenConfig.angleSpread;

      // Middle columns get full angleOffset, top/bottom columns get less
      // middleFactor is 1 at center (spreadFactor=0), 0 at edges (spreadFactor=±0.5)
      const middleFactor = 1 - Math.abs(spreadFactor * 2);
      const columnAngleOffset = config.angleOffset * middleFactor;

      // Top/bottom rows have base distanceInward of 0.3, middle has 0
      // edgeFactor is 0 at center, 1 at edges
      const edgeFactor = Math.abs(spreadFactor * 2);
      const baseDistanceInward = edgeFactor * 0.3;
      const baseTotalDistanceInward = baseDistanceInward - config.distanceOut;

      // Position instances in a circle for this column
      for (let i = 0; i < config.count; i++) {
        // Get which branch type this instance should use (needed for distance variation)
        const branchIndex = instanceAssignments[globalInstanceIndex];

        // Add random distance inward variation (0 to 0.1) for all branches except branch 6
        const randomDistanceVariation =
          branchIndex !== 6
            ? random(config.randomSeed + globalInstanceIndex * 1000) * 0.1
            : 0;
        const totalDistanceInward =
          baseTotalDistanceInward + randomDistanceVariation;

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
          inwardDir.x * totalDistanceInward,
          inwardDir.y * totalDistanceInward,
          inwardDir.z * totalDistanceInward
        );

        // Apply rotations:
        // - Base rotation: X = base tilt (perpendicular), Y = circular angle + angle spread, Z = fold Z
        // - Fold X: perpendicular fold on X axis (up/down in tangent direction)
        // - Fold Y: perpendicular fold on Y axis (up/down in another direction)
        dummy.rotation.set(
          hiddenConfig.tiltAngle,
          angle + angleSpread,
          Math.PI / 2 + foldZ
        );
        dummy.updateMatrix();

        // Apply fold X, fold Y, and overall fold as additional local rotations using quaternions
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
        // Overall fold applies uniformly to all columns (like foldY but constant)
        const overallFoldQuaternion = new THREE.Quaternion().setFromAxisAngle(
          new THREE.Vector3(0, 1, 0),
          config.overallFold
        );

        // Combine: base * foldX * foldY * overallFold
        baseQuaternion
          .multiply(foldXQuaternion)
          .multiply(foldYQuaternion)
          .multiply(overallFoldQuaternion);
        dummy.quaternion.copy(baseQuaternion);

        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();

        // Get mesh index for this branch type (branchIndex already retrieved above)
        const meshIndex = branchInstanceIndices[branchIndex];

        // Set the matrix for the appropriate branch type's instanced mesh
        // This includes both layer 1 and layer 2 (duplicate glass meshes)
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

  // Auto-rotation animation
  useFrame((state, delta) => {
    if (config.autoRotate && groupRef.current) {
      groupRef.current.rotation.y += delta * 0.2; // Slow rotation (0.2 radians per second)
    }
  });

  if (branchMeshData.length === 0) return null;

  return (
    <group ref={groupRef}>
      {branchMeshData.map((meshes, branchIndex) => {
        const count = instanceCounts[branchIndex];
        if (count === 0) return null; // Skip if no instances for this branch

        return meshes.map((meshData, meshIndex) => {
          // Check if the mesh name includes "glass" or matches specific mesh names
          const isGlassMesh =
            meshData.name.toLowerCase().includes("glass") ||
            meshData.name === "MET-59_3D-Model17661";

          // Check if the mesh name contains "17363" - use black material
          const isBlackMesh = meshData.name.includes("17363");
          const materialToUse = isGlassMesh
            ? null
            : isBlackMesh
            ? blackMaterial
            : goldMetalMaterial; // Use gold metal for all other non-glass meshes

          return (
            <>
              {/* First layer - original glass mesh */}
              <instancedMesh
                key={`branch-${branchIndex}-mesh-${meshIndex}-layer1-${totalInstances}-${config.randomSeed}`}
                ref={(ref) => {
                  instancedMeshRefs.current[
                    `branch-${branchIndex}-mesh-${meshIndex}`
                  ] = ref;
                }}
                args={[meshData.geometry, materialToUse, count]}
              >
                {isGlassMesh && (
                  <MiracleGlass
                    ior={1.5}
                    absorptionColor={"#ffffff"}
                    isBackFace={false}
                    thickness={0.01}
                    envIntensity={1.5}
                    edgeReflectionIntensity={0.5}
                    edgeReflectionPower={0.9}
                    edgeReflectionWidth={0.1}
                    shellLayer={2}
                  />
                )}
              </instancedMesh>

              {/* Second layer - duplicate glass mesh with different material */}
              {isGlassMesh && (
                <instancedMesh
                  key={`branch-${branchIndex}-mesh-${meshIndex}-layer2-${totalInstances}-${config.randomSeed}`}
                  ref={(ref) => {
                    instancedMeshRefs.current[
                      `branch-${branchIndex}-mesh-${meshIndex}-layer2`
                    ] = ref;
                  }}
                  args={[meshData.geometry, null, count]}
                >
                  <MiracleGlass
                    ior={1.5}
                    absorptionColor={"#ffffff"}
                    isBackFace={true}
                    thickness={0.01}
                    envIntensity={1.2}
                    edgeReflectionIntensity={0.5}
                    edgeReflectionPower={0.9}
                    edgeReflectionWidth={0.1}
                    shellLayer={3}
                    roughness={0.1}
                  />
                </instancedMesh>
              )}
            </>
          );
        });
      })}
    </group>
  );
}

export default Branch;
