import { MeshReflectorMaterial } from "@react-three/drei";
import * as THREE from "three";

/**
 * ReflectivePlatform Component
 * 
 * A reusable reflective ground/platform component using MeshReflectorMaterial
 * from @react-three/drei for realistic reflections.
 * 
 * @example
 * ```tsx
 * <ReflectivePlatform 
 *   size={80} 
 *   position={[0, -0.01, 0]}
 *   receiveShadow
 * />
 * ```
 */
export function ReflectivePlatform({
  size = 80,
  position = [0, -0.01, 0],
  rotation = [-Math.PI / 2, 0, 0],
  receiveShadow = true,
  blur = [800, 800],
  resolution = 2048,
  mixBlur = 0.5,
  mixStrength = 10,
  roughness = 1,
  depthScale = 1,
  minDepthThreshold = 0.4,
  maxDepthThreshold = 1.2,
  color = "#363643",
  metalness = 0.01,
  mirror = 0.3,
  transparent = true,
  opacity = 0.5,
}) {
  return (
    <mesh
      receiveShadow={receiveShadow}
      rotation={rotation}
      position={position}
    >
      <planeGeometry args={[size, size]} />
      <MeshReflectorMaterial
        blur={blur}
        resolution={resolution}
        mixBlur={mixBlur}
        mixStrength={mixStrength}
        roughness={roughness}
        depthScale={depthScale}
        minDepthThreshold={minDepthThreshold}
        maxDepthThreshold={maxDepthThreshold}
        color={color}
        metalness={metalness}
        mirror={mirror}
        transparent={transparent}
        opacity={opacity}
      />
    </mesh>
  );
}

/**
 * Alternative Simple Reflective Platform
 * 
 * Uses standard Three.js material (no external dependencies)
 * Good for simpler projects or when you want lighter weight
 */
export function SimpleReflectivePlatform({
  size = 80,
  position = [0, 0, 0],
  rotation = [-Math.PI / 2, 0, 0],
  receiveShadow = true,
  color = "#1a1a1a",
  metalness = 0.8,
  roughness = 0.2,
}) {
  return (
    <mesh
      receiveShadow={receiveShadow}
      rotation={rotation}
      position={position}
    >
      <planeGeometry args={[size, size]} />
      <meshStandardMaterial
        color={color}
        metalness={metalness}
        roughness={roughness}
      />
    </mesh>
  );
}

