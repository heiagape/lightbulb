import React, { useRef, useMemo } from "react";
import { useLoader, useThree } from "@react-three/fiber";
import { RGBELoader } from "three-stdlib";
import * as THREE from "three";
import CustomGlassMaterial from "./CustomGlassMaterial_volume37";
//import CustomGlassMaterial from '../CustomGlassMaterial_original';

/**
 * Reusable glass material configurations for perfume bottles
 * This component provides pre-configured glass materials that can be used across all models
 */

// Default glass material configuration
const defaultGlassConfig = {
  //absorptionColor: 0x363737,
  //absorptionColor: 0xD3D3D3,
  absorptionColor: 0xffffff,
  absorptionPower: 0.1,
  reflectionIntensity: 0.2,
  transmissionIntensity: 1.0,
  chromaticAberration: 0.0,
  distortion: 0.0,
  distortionScale: 0.0,
  temporalDistortion: 0.0,
  roughness: 0.0,
  samples: 3,
  enableReflections: true,
  opacity: 0.8,
  ior: 1.5,
  thickness: 0.04,
};

const innerGlassConfig = {
  excludeFrontObjects: true,
  absorptionColor: 0xffac1c,
  shellLayer: 1,
  colorIntensity: 1.0,
  absorptionPower: 0.1,
  reflectionIntensity: 0.1,
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
  isBackFace: false,
  brightnessThreshold: 1.0, // Only reflect very bright areas (0.0-1.0)
  brightnessSmoothing: 0.6,
  envIntensity: 1.9,
  edgeReflectionIntensity: 0.0, // Brighter edges
  edgeReflectionPower: 0.1, // Softer falloff
  edgeReflectionWidth: 0.0,
};

//La Vie Est Belle specific glass configuration
const laVieEstBelleGlassConfig = {
  absorptionColor: 0xffffff,
  absorptionPower: 0.1,
  reflectionIntensity: 0.01,
  transmissionIntensity: 1.0,
  chromaticAberration: 0.1,
  distortion: 0.0,
  distortionScale: 0.0,
  temporalDistortion: 0.0,
  roughness: 0.0,
  samples: 3,
  enableReflections: true,
  opacity: 1.0,
  ior: 1.8,
  thickness: 0.07,
  brightnessThreshold: 1.0, // Only reflect very bright areas (0.0-1.0)
  brightnessSmoothing: 0.6,
  envIntensity: 1.8,
  edgeReflectionIntensity: 1.0, // Brighter edges
  edgeReflectionPower: 0.1, // Softer falloff
  edgeReflectionWidth: 0.4,
};

// Idole specific glass configuration
const idoleGlassConfig = {
  absorptionColor: 0xffffff,
  absorptionPower: 0.1,
  reflectionIntensity: 0.2,
  transmissionIntensity: 1.0,
  chromaticAberration: 0.1,
  distortion: 0.0,
  distortionScale: 0.0,
  temporalDistortion: 0.0,
  roughness: 0.0,
  samples: 3,
  enableReflections: true,
  opacity: 1.0,
  ior: 1.5,
  thickness: 0.07,
  brightnessThreshold: 0.8, // Only reflect very bright areas (0.0-1.0)
  brightnessSmoothing: 0.6,
  envIntensity: 0.9,
  isBackFace: false,
};

// Miracle specific glass configuration
const miracleGlassConfig = {
  absorptionColor: 0xffffff,
  absorptionPower: 0.1,
  reflectionIntensity: 0.01,
  transmissionIntensity: 1.0,
  chromaticAberration: 0.2,
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
  edgeReflectionWidth: 0.4, // Wider edge effect  //isBackFace: true,
};

// Tresor specific glass configuration
const tresorGlassConfig = {
  absorptionColor: 0xffffff,
  absorptionPower: 0.3,
  reflectionIntensity: 1.8,
  transmissionIntensity: 1.2,
  chromaticAberration: 0.1,
  distortion: 0.0,
  distortionScale: 0.0,
  temporalDistortion: 0.0,
  roughness: 0.0,
  samples: 3,
  enableReflections: true,
  opacity: 1.0,
  ior: 1.5,
  thickness: 0.19,
  brightnessThreshold: 0.8, // Only reflect very bright areas (0.0-1.0)
  brightnessSmoothing: 0.6,
  envIntensity: 1.0,
  edgeReflectionIntensity: 0.0, // Brighter edges
  edgeReflectionPower: 0.0, // Softer falloff
  edgeReflectionWidth: 0.0,
  //filterHDR: false
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
        // encoding: THREE.sRGBEncoding
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
  // const envMap = useEnvironmentMap('/hdris/dresden_station_night_2k.hdr');
  //  const envMap = useEnvironmentMap('/hdris/metro_noord_2k.hdr');
  //const envMap = useEnvironmentMap('https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/2k/brown_photostudio_06_2k.hdr');
  const envMap = useEnvironmentMap("/colorful_studio_4k.hdr");

  return (
    <CustomGlassMaterial
      ref={materialRef}
      envMap={envMap}
      {...miracleGlassConfig}
      {...props}
    />
  );
};
/**
 * Reusable glass material component for La Vie Est Belle bottles
 */
// export const LaVieEstBelleGlass = ({ ref: materialRef, ...props }) => {
//   const envMap = useEnvironmentMap('/hdris/colorful_studio_4k.hdr');

//   return (
//     <CustomGlassMaterial
//       ref={materialRef}
//       envMap={envMap}
//       {...laVieEstBelleGlassConfig}
//       {...props}
//     />
//   );
// };

// /**
//  * Reusable glass material component for Idole bottles
//  */
// export const IdoleGlass = ({ ref: materialRef, ...props }) => {
//   const envMap = useEnvironmentMap('/hdris/colorful_studio_4k.hdr');

//   return (
//     <CustomGlassMaterial
//       ref={materialRef}
//       envMap={envMap}
//       {...idoleGlassConfig}
//       {...props}
//     />
//   );
// };

// /**
//  * Reusable glass material component for Miracle bottles
//  */
// export const MiracleGlass = ({ ref: materialRef, ...props }) => {
//   const envMap = useEnvironmentMap('/hdris/colorful_studio_4k.hdr');

//   return (
//     <CustomGlassMaterial
//       ref={materialRef}
//       envMap={envMap}
//       {...miracleGlassConfig}
//       {...props}
//     />
//   );
// };

// /**
//  * Reusable glass material component for Tresor bottles
//  */
// export const TresorGlass = ({ ref: materialRef, ...props }) => {
//   const envMap = useEnvironmentMap('/hdris/colorful_studio_4k.hdr');

//   return (
//     <CustomGlassMaterial
//       ref={materialRef}
//       envMap={envMap}
//       {...tresorGlassConfig}
//       {...props}
//     />
//   );
// };

// /**
//  * Generic glass material component with custom configuration
//  */
// export const CustomGlass = ({
//   ref: materialRef,
//   hdrPath = '/hdris/colorful_studio_4k.hdr',
//   config = defaultGlassConfig,
//   ...props
// }) => {
//   const envMap = useEnvironmentMap(hdrPath);

//   return (
//     <CustomGlassMaterial
//       ref={materialRef}
//       envMap={envMap}
//       {...config}
//       {...props}
//     />
//   );
// };

// // Export the default configuration for manual use
// export const defaultGlassMaterialConfig = defaultGlassConfig;
// export const glassMaterialConfigs = {
//   laVieEstBelle: laVieEstBelleGlassConfig,
//   idole: idoleGlassConfig,
//   miracle: miracleGlassConfig,
//   tresor: tresorGlassConfig,
// };
