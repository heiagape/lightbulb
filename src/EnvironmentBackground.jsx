import { useMemo } from "react";
import { useEnvironmentMap } from "./GlassMaterials";
import * as THREE from "three";

function EnvironmentBackground() {
  const envMap = useEnvironmentMap("/hdris/metro_noord_1k.hdr");

  const backgroundMaterial = useMemo(() => {
    if (!envMap) return null;

    return new THREE.ShaderMaterial({
      uniforms: {
        envMap: { value: envMap },
      },
      vertexShader: `
        varying vec3 vWorldDirection;
        
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldDirection = normalize(worldPosition.xyz);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform samplerCube envMap;
        varying vec3 vWorldDirection;
        
        void main() {
          vec3 color = textureCube(envMap, vWorldDirection).rgb;
          gl_FragColor = vec4(color, 1.0);
        }
      `,
      side: THREE.BackSide,
      depthWrite: false,
    });
  }, [envMap]);

  if (!backgroundMaterial) return null;

  return (
    <mesh>
      <sphereGeometry args={[500, 60, 40]} />
      <primitive object={backgroundMaterial} attach="material" />
    </mesh>
  );
}

export default EnvironmentBackground;
