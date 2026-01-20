import React, { useMemo } from "react";
import { useLoader, useThree } from "@react-three/fiber";
import { RGBELoader } from "three-stdlib";
import * as THREE from "three";
import CustomGlassMaterial from "./CustomGlassMaterial_volume38";

// Miracle specific glass configuration
const miracleGlassConfig = {
  absorptionColor: 0xffffff,
  absorptionPower: 0.1,
  reflectionIntensity: 0.01,
  transmissionIntensity: 1.0,
  chromaticAberration: 0.05,
  distortion: 0.0,
  distortionScale: 0.0,
  temporalDistortion: 0.0,
  roughness: 0.0,
  samples: 3,
  enableReflections: true,
  opacity: 1.0,
  ior: 1.8,
  thickness: 0.0,
  brightnessThreshold: 1.0, // Only reflect very bright areas (0.0-1.0)
  brightnessSmoothing: 0.6,
  envIntensity: 1.8,
  edgeReflectionIntensity: 1.0, // Brighter edges
  edgeReflectionPower: 0.1, // Softer falloff
  edgeReflectionWidth: 0.4, // Wider edge effect
};

/**
 * Hook to create environment map from HDR
 */
export const useEnvironmentMap = (hdrPath) => {
  const { gl } = useThree();
  const hdr = useLoader(RGBELoader, hdrPath);

  const envMapCube = useMemo(() => {
    if (hdr && gl) {
      // Create cube render target with proper settings
      const cubeRT = new THREE.WebGLCubeRenderTarget(512, {
        format: THREE.RGBAFormat,
        generateMipmaps: true,
        minFilter: THREE.LinearMipmapLinearFilter,
        magFilter: THREE.LinearFilter,
        type: THREE.UnsignedByteType,
      });

      // Convert equirectangular texture to cube texture
      cubeRT.fromEquirectangularTexture(gl, hdr);

      // This is a CubeTexture suitable for samplerCube
      const cubeMapTexture = cubeRT.texture;

      return cubeMapTexture;
    }
    return null;
  }, [hdr, gl]);

  return envMapCube;
};

export const MiracleGlass = ({ ref: materialRef, ...props }) => {
  const envMap = useEnvironmentMap("/hdris/colorful_studio_1k.hdr");

  return (
    <CustomGlassMaterial
      ref={materialRef}
      envMap={envMap}
      {...miracleGlassConfig}
      {...props}
    />
  );
};

// Variant of MiracleGlass for ultra-thin shells (e.g. transparent bulbs)
export const ThinMiracleGlass = ({ ref: materialRef, ...props }) => {
  const envMap = useEnvironmentMap("/hdris/colorful_studio_1k.hdr");

  return (
    <CustomGlassMaterial
      ref={materialRef}
      envMap={envMap}
      {...miracleGlassConfig}
      thickness={0.0}
      {...props}
    />
  );
};
