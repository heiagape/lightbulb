import { useLoader } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { TextureLoader } from "three";
import { useEffect, useMemo } from "react";
import * as THREE from "three";

// Hook to load the Stem.glb model
export function useStem() {
  const gltf = useLoader(GLTFLoader, "/assets/Stem.glb");
  return gltf;
}

// Stem component - loads and renders the central stem model
export function Stem() {
  const gltf = useStem();

  // Load textures
  const [baseColor, normalMap, roughnessMap, metallicMap, aoMap] = useLoader(
    TextureLoader,
    [
      "/materials/Poliigon_MetalSteelBrushed_7174_BaseColor.jpg",
      "/materials/Poliigon_MetalSteelBrushed_7174_Normal.png",
      "/materials/Poliigon_MetalSteelBrushed_7174_Roughness.jpg",
      "/materials/Poliigon_MetalSteelBrushed_7174_Metallic.jpg",
      "/materials/Poliigon_MetalSteelBrushed_7174_AmbientOcclusion.jpg",
    ]
  );

  // Configure textures
  useEffect(() => {
    [baseColor, normalMap, roughnessMap, metallicMap, aoMap].forEach((t) => {
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
    });
    baseColor.colorSpace = THREE.SRGBColorSpace;
  }, [baseColor, normalMap, roughnessMap, metallicMap, aoMap]);

  const metalMaterial = useMemo(() => {
    return new THREE.MeshPhysicalMaterial({
      map: baseColor,
      normalMap: normalMap,
      roughnessMap: roughnessMap,
      metalnessMap: metallicMap,
      aoMap: aoMap,
      color: new THREE.Color("#2a2a2a"), // Dark base with slight visibility
      metalness: 0.9, // High metalness for reflections
      roughness: 0.1, // Low roughness for shiny reflective surface
      envMapIntensity: 3.0, // Strong environment reflections
      emissive: new THREE.Color("#3d2a0a"), // Subtle warm gold edge glow
      emissiveIntensity: 0.08,
      // Glassy/transparent properties
      transmission: 0.15, // Slight transparency for glassy feel
      thickness: 0.5, // Thickness for refraction
      clearcoat: 1.0, // Full clearcoat for glossy layer
      clearcoatRoughness: 0.05, // Very smooth clearcoat
      ior: 1.5, // Index of refraction for glass-like effect
      transparent: true,
      opacity: 0.92, // Slight transparency
    });
  }, [baseColor, normalMap, roughnessMap, metallicMap, aoMap]);

  useEffect(() => {
    if (gltf.scene) {
      gltf.scene.traverse((child) => {
        if (child.isMesh) {
          child.material = metalMaterial;
        }
      });
    }
  }, [gltf, metalMaterial]);

  return <primitive object={gltf.scene} />;
}
