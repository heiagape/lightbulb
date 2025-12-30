import React, { useMemo, useRef, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

// Hook that creates and returns the glass material
export function useCustomGlassMaterial({
  envMap = null,
  thicknessMap = null,
  thickness = 0.4,
  absorptionColor = 0xd47d5a,
  absorptionPower = 0.1,
  colorIntensity = 1.0,
  reflectionIntensity = 0.9,
  transmissionIntensity = 0.6,
  chromaticAberration = 0.05,
  roughness = 0.1,
  samples = 3,
  farPlaneZ = 200,
  isInnerSurface = false,
  depthWrite = true,
  depthTest = true,
  brightReflectionIntensity = 0.3,
  specularHighlightIntensity = 0.5,
  enableReflections = true,
  envIntensity = 2.0,
  ior = 1.5,
  opacity = 1.0,
  renderOrder = 0,
  shellLayer = 0,
  isBackFace = false,
  brightnessThreshold = 0.5,
  brightnessSmoothing = 0.2,
  filterHDR = true,
  edgeReflectionIntensity = 3.0,
  edgeReflectionPower = 3.0,
  edgeReflectionWidth = 0.3,
  normalMap = null,
  useNormalMap = false,
  normalScale = 1.0,
  resolutionMultiplier = 2.0,
  curvatureMap = null,
  useCurvatureMap = false,
  curvatureScale = 1.0,
  enableLighting = true,
  specularStrength = 1.0,
  shininess = 64.0,
  maxLights = 3,
  positionNormalMap = null,
  usePositionNormalMap = false,
  positionFresnelPower = 2.0,
  positionFresnelIntensity = 0.5,
  enabledLightNames = null,
  useInstancing = false,
}) {
  const materialRef = useRef();
  const { scene, gl, camera } = useThree();

  // Ensure normal map has correct encoding
  useEffect(() => {
    if (normalMap) {
      normalMap.colorSpace = THREE.NoColorSpace;
      normalMap.needsUpdate = true;
    }
  }, [normalMap]);

  // Ensure curvature map has correct encoding
  useEffect(() => {
    if (curvatureMap) {
      curvatureMap.colorSpace = THREE.NoColorSpace;
      curvatureMap.needsUpdate = true;
    }
  }, [curvatureMap]);

  useEffect(() => {
    if (positionNormalMap) {
      positionNormalMap.colorSpace = THREE.NoColorSpace;
      positionNormalMap.needsUpdate = true;
    }
  }, [positionNormalMap]);

  // Create render target for transmission sampling WITH DEPTH TEXTURE - HIGHER RESOLUTION
  const transmissionRenderTarget = useMemo(() => {
    const size = gl.getSize(new THREE.Vector2());
    const pixelRatio = window.devicePixelRatio;
    const width = Math.floor(size.x * pixelRatio);
    const height = Math.floor(size.y * pixelRatio);

    const target = new THREE.WebGLRenderTarget(width, height, {
      wrapS: THREE.ClampToEdgeWrapping,
      wrapT: THREE.ClampToEdgeWrapping,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.HalfFloatType,
      stencilBuffer: false,
      depthBuffer: true,
      generateMipmaps: true,
    });

    target.depthTexture = new THREE.DepthTexture(
      width,
      height,
      THREE.UnsignedIntType
    );

    return target;
  }, [gl, resolutionMultiplier]);

  // Create depth render target for occlusion detection - HIGHER RESOLUTION
  const depthRenderTarget = useMemo(() => {
    const size = gl.getSize(new THREE.Vector2());
    //const pixelRatio = Math.min(window.devicePixelRatio, 2)
    const pixelRatio = window.devicePixelRatio;
    const width = Math.floor(size.x * pixelRatio);
    const height = Math.floor(size.y * pixelRatio);

    return new THREE.WebGLRenderTarget(width, height, {
      wrapS: THREE.ClampToEdgeWrapping,
      wrapT: THREE.ClampToEdgeWrapping,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.FloatType,
      stencilBuffer: false,
      depthBuffer: true,
    });
  }, [gl]);

  // Create background scene with HDR environment
  const backgroundScene = useMemo(() => {
    const bgScene = new THREE.Scene();

    const sphereGeometry = new THREE.SphereGeometry(500, 60, 40);
    sphereGeometry.scale(-1, 1, 1);

    const sphereMaterial = new THREE.ShaderMaterial({
      uniforms: {
        envMap: { value: envMap },
        brightnessThreshold: { value: brightnessThreshold },
        brightnessSmoothing: { value: brightnessSmoothing },
        filterHDR: { value: filterHDR },
      },
      vertexShader: `
        varying vec3 vWorldDirection;
        
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldDirection = worldPosition.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform samplerCube envMap;
        uniform float brightnessThreshold;
        uniform float brightnessSmoothing;
        uniform bool filterHDR;
        varying vec3 vWorldDirection;
        
        vec3 extractBrightAreas(vec3 color, float threshold, float smoothing) {
          float luminance = dot(color, vec3(0.2126, 0.7152, 0.0722));
          float brightnessFactor = smoothstep(threshold - smoothing, threshold + smoothing, luminance);
          return color * brightnessFactor;
        }
        
        void main() {
          vec3 direction = normalize(vWorldDirection);
          vec3 color = textureCube(envMap, direction).rgb;
          
          if (filterHDR) {
            color = extractBrightAreas(color, brightnessThreshold, brightnessSmoothing);
          }
          
          gl_FragColor = vec4(color, 1.0);
        }
      `,
      side: THREE.BackSide,
      depthWrite: false,
    });

    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    bgScene.add(sphere);

    return bgScene;
  }, [envMap, brightnessThreshold, brightnessSmoothing, filterHDR]);

  // Create the glass material using the factory function
  const glassMaterial = useMemo(() => {
    const sceneVertexShader = `
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vFragPos;
varying vec4 vWorldPosition;
varying vec4 vScreenPosition;
varying vec3 vViewPosition;
varying vec3 vPosition;
attribute vec4 tangent;
varying vec3 vTangent;
varying vec3 vBitangent;

void main() {
 #ifdef USE_INSTANCING
      // Combine parent group transform (modelMatrix) with per-instance transform (instanceMatrix)
      mat4 effectiveModelMatrix = modelMatrix * instanceMatrix;
      mat4 effectiveModelViewMatrix = viewMatrix * modelMatrix * instanceMatrix;
    #else
      mat4 effectiveModelMatrix = modelMatrix;
      mat4 effectiveModelViewMatrix = modelViewMatrix;
    #endif
vTangent = normalize((effectiveModelMatrix * vec4(tangent.xyz, 0.0)).xyz);
    vec3 normal = normalize((effectiveModelMatrix * vec4(normal, 0.0)).xyz);
    vBitangent = cross(normal, vTangent) * tangent.w;
    vec4 worldPosition = effectiveModelMatrix * vec4(position, 1.0);
    vec4 screenPosition = projectionMatrix * effectiveModelViewMatrix * vec4(position, 1.0);
    vec4 viewPosition = effectiveModelViewMatrix * vec4(position, 1.0);
    
    gl_Position = screenPosition;
    vUv = uv;
    //vNormal = normalize((effectiveModelMatrix * vec4(normal, 0.0)).xyz);
    vNormal = normalize(mat3(transpose(inverse(effectiveModelMatrix))) * normal);
    vFragPos = (effectiveModelMatrix * vec4(position, 1.0)).xyz;
    //vFragPos = worldPosition.xyz;
    vWorldPosition = worldPosition;
    vScreenPosition = screenPosition;
    vViewPosition = viewPosition.xyz;
    vPosition = position;
}`;

    const sceneFragmentShader =
      `
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vFragPos;
varying vec4 vWorldPosition;
varying vec4 vScreenPosition;
varying vec3 vViewPosition;
varying vec3 vPosition;
varying vec3 vTangent;
varying vec3 vBitangent;

uniform samplerCube radiance;
uniform sampler2D thicknessMap;
uniform bool hasThicknessMap;
uniform sampler2D transmissionSamplerMap;
uniform sampler2D sceneDepth;
uniform vec2 resolution;

uniform mat4 modelMatrix;
uniform mat4 projectionMatrix;

uniform float reflectionIntensity;
uniform float transmissionIntensity;
uniform vec3 absorptionColor;
uniform float absorptionPower;
uniform float colorIntensity;

uniform float chromaticAberration;
uniform float roughness;
uniform int samples;
uniform bool enableReflections;
uniform float envIntensity;
uniform float opacity;
uniform float ior;
uniform float thickness;

uniform float cameraNear;
uniform float cameraFar;

uniform float brightnessThreshold;
uniform float brightnessSmoothing;
uniform bool filterHDR;

uniform float edgeReflectionIntensity;
uniform float edgeReflectionPower;
uniform float edgeReflectionWidth;

uniform sampler2D normalMap;
uniform bool useNormalMap;
uniform float normalScale;

uniform sampler2D curvatureMap;
uniform bool useCurvatureMap;
uniform float curvatureScale;

uniform sampler2D positionNormalMap;
uniform bool usePositionNormalMap;
uniform float positionFresnelPower;
uniform float positionFresnelIntensity;

// Lighting uniforms (specular only)
uniform bool enableLighting;
uniform float specularStrength;
uniform float shininess;

uniform int numPointLights;
uniform vec3 pointLightPositions[` +
      maxLights +
      `];
uniform vec3 pointLightColors[` +
      maxLights +
      `];
uniform float pointLightIntensities[` +
      maxLights +
      `];
uniform float pointLightDistances[` +
      maxLights +
      `];

uniform int numDirectionalLights;
uniform vec3 directionalLightDirections[` +
      maxLights +
      `];
uniform vec3 directionalLightColors[` +
      maxLights +
      `];
uniform float directionalLightIntensities[` +
      maxLights +
      `];

const float farPlaneZ = ` +
      farPlaneZ +
      `.0;

vec2 worldToScreen(vec3 worldPos) {
    vec4 clipSpace = projectionMatrix * viewMatrix * vec4(worldPos, 1.0);
    vec3 ndc = clipSpace.xyz / clipSpace.w;
    return ndc.xy * 0.5 + 0.5;
}

float getLinearDepth(float depth) {
    return (2.0 * cameraNear) / (cameraFar + cameraNear - depth * (cameraFar - cameraNear));
}

vec3 getWorldPositionFromDepth(vec2 uv, float depth) {
    vec4 ndc = vec4(uv * 2.0 - 1.0, depth * 2.0 - 1.0, 1.0);
    vec4 viewPos = inverse(projectionMatrix) * ndc;
    viewPos /= viewPos.w;
    vec4 worldPos = inverse(viewMatrix) * viewPos;
    return worldPos.xyz;
}

float hash(float x) {
    return fract(sin(x * 12.9898) * 43758.5453);
}

float hash(vec2 v) { 
    return hash(v.x + hash(v.y)); 
}

float hash(vec3 v) { 
    return hash(v.x + hash(v.y) + hash(v.z)); 
}

float rand(float seed) {
    return hash(vec3(gl_FragCoord.xy, seed));
}

float fresnelSchlick(float cosTheta, float F0) {
    return F0 + (1.0 - F0) * pow(clamp(1.0 - cosTheta, 0.0, 1.0), 5.0);
}

float getDispersedIOR(float wavelength, float baseIOR, float dispersion) {
    return baseIOR + dispersion / (wavelength * wavelength);
}

vec3 applyVolumeAttenuation(const in vec3 radiance, const in float transmissionDistance, const in vec3 attenuationColor, const in float attenuationDistance, const in float colorIntensity) {
    if (attenuationDistance > 1000.0) {
        return radiance;
    } else {
        // Calculate base attenuation
        vec3 attenuationCoefficient = -log(attenuationColor + 0.001) / attenuationDistance;
        vec3 transmittance = exp(-attenuationCoefficient * transmissionDistance);
        
        // Mix between original radiance and colored transmittance based on colorIntensity
        // colorIntensity = 0: no color tint (original radiance)
        // colorIntensity = 1: full color tint (transmittance effect)
        vec3 coloredRadiance = radiance * transmittance;
        return mix(radiance, coloredRadiance, colorIntensity);
    }
}

vec3 extractBrightAreas(vec3 color, float threshold, float smoothing) {
    float luminance = dot(color, vec3(0.2126, 0.7152, 0.0722));
    float brightnessFactor = smoothstep(threshold - smoothing, threshold + smoothing, luminance);
    return color * brightnessFactor;
}

mat3 calculateTBN(vec3 normal, vec3 position, vec2 uv) {
    vec3 dp1 = dFdx(position);
    vec3 dp2 = dFdy(position);
    vec2 duv1 = dFdx(uv);
    vec2 duv2 = dFdy(uv);
    
    vec3 dp2perp = cross(dp2, normal);
    vec3 dp1perp = cross(normal, dp1);
    vec3 T = dp2perp * duv1.x + dp1perp * duv2.x;
    vec3 B = dp2perp * duv1.y + dp1perp * duv2.y;
    
    float invmax = inversesqrt(max(dot(T, T), dot(B, B)));
    return mat3(T * invmax, B * invmax, normal);
}

float getEdgeAwareDepthBias(float NdotV, float baseDistance) {
    float edgeProximity = 1.0 - NdotV;
    return 0.01 + edgeProximity * 0.1 + baseDistance * 0.001;
}

bool isValidUV(vec2 uv) {
    const float margin = 0.001;
    return uv.x >= margin && uv.x <= (1.0 - margin) && 
           uv.y >= margin && uv.y <= (1.0 - margin);
}

vec2 safeClampUV(vec2 uv) {
    const float margin = 0.001;
    return clamp(uv, margin, 1.0 - margin);
}

float getDispersionSpread(vec3 refractedR, vec3 refractedG, vec3 refractedB) {
    float spreadRG = length(refractedR - refractedG);
    float spreadGB = length(refractedG - refractedB);
    return max(spreadRG, spreadGB);
}

vec3 getEnhancedTransmission(
    const in vec3 n, 
    const in vec3 v, 
    const in float thickness1, 
    const in float iorValue, 
    const in float thicknessSample, 
    const in bool isFrontFacing,
    const in float NdotV,
    out float tirFactor
) {
    vec3 transmission = vec3(0.0);
    float runningSeed = 0.0;
    tirFactor = 0.0;
    
    int validSamples = 0;
    vec3 fragWorldPos = vFragPos;
    
    vec3 sampleNorm = normalize(n);
    
    float baseDispersion = chromaticAberration * 0.5;
    float iorR = iorValue * (1.0 - baseDispersion);
    float iorG = iorValue;
    float iorB = iorValue * (1.0 + baseDispersion);
    
    float iorRatioR = isFrontFacing ? (1.0 / iorR) : iorR;
    float iorRatioG = isFrontFacing ? (1.0 / iorG) : iorG;
    float iorRatioB = isFrontFacing ? (1.0 / iorB) : iorB;
    
    vec3 refractedR = refract(-v, sampleNorm, iorRatioR);
    vec3 refractedG = refract(-v, sampleNorm, iorRatioG);
    vec3 refractedB = refract(-v, sampleNorm, iorRatioB);
    
    float dispersionSpread = getDispersionSpread(refractedR, refractedG, refractedB);
    
    int adaptiveSamples = samples;
    if (dispersionSpread > 0.1) {
        adaptiveSamples = min(samples * 2, 20);
    }
    
    float edgeFactor = pow(1.0 - abs(NdotV), 2.0);
    float adaptiveChromaticAberration = chromaticAberration * (1.0 - edgeFactor * 0.5);
    
    for (int i = 0; i < 20; i++) {
        if (i >= adaptiveSamples) break;
        
        vec3 sampleNorm = normalize(n + roughness * roughness * 2.0 * 
            normalize(vec3(rand(runningSeed++) - 0.5, rand(runningSeed++) - 0.5, rand(runningSeed++) - 0.5)) * 
            pow(rand(runningSeed++), 0.33));
        
        float baseDispersion = adaptiveChromaticAberration * 0.5;
        float iorR = iorValue * (1.0 - baseDispersion);
        float iorG = iorValue;
        float iorB = iorValue * (1.0 + baseDispersion);
        
        float iorRatioR = isFrontFacing ? (1.0 / iorR) : iorR;
        float iorRatioG = isFrontFacing ? (1.0 / iorG) : iorG;
        float iorRatioB = isFrontFacing ? (1.0 / iorB) : iorB;
        
        vec3 refractedR = refract(-v, sampleNorm, iorRatioR);
        vec3 refractedG = refract(-v, sampleNorm, iorRatioG);
        vec3 refractedB = refract(-v, sampleNorm, iorRatioB);
        
        bool tirR = length(refractedR) < 0.001;
        bool tirG = length(refractedG) < 0.001;
        bool tirB = length(refractedB) < 0.001;
        
        if (tirR || tirG || tirB) {
            tirFactor += 1.0;
            continue;
        }

        vec3 worldRefractedR = normalize((modelMatrix * vec4(refractedR, 0.0)).xyz);
        vec3 worldRefractedG = normalize((modelMatrix * vec4(refractedG, 0.0)).xyz);
        vec3 worldRefractedB = normalize((modelMatrix * vec4(refractedB, 0.0)).xyz);
        
        vec2 fragUV = worldToScreen(fragWorldPos);
        float nearbyDepth = texture2D(sceneDepth, fragUV).r;
        vec3 nearbyWorldPos = getWorldPositionFromDepth(fragUV, nearbyDepth);
        float distToNearby = length(nearbyWorldPos - fragWorldPos);

        float adaptiveDistance = min(distToNearby * 0.8, thickness1 * thicknessSample * 3.0);
        adaptiveDistance = max(adaptiveDistance, 0.001);
        
        vec3 refractedWorldPosR = fragWorldPos + worldRefractedR * adaptiveDistance;
        vec3 refractedWorldPosG = fragWorldPos + worldRefractedG * adaptiveDistance;
        vec3 refractedWorldPosB = fragWorldPos + worldRefractedB * adaptiveDistance;
        
        vec2 uvR = worldToScreen(refractedWorldPosR);
        vec2 uvG = worldToScreen(refractedWorldPosG);
        vec2 uvB = worldToScreen(refractedWorldPosB);
        
        bool validR = isValidUV(uvR);
        bool validG = isValidUV(uvG);
        bool validB = isValidUV(uvB);
        
        vec2 directUV = worldToScreen(fragWorldPos);
        
        uvR = safeClampUV(uvR);
        uvG = safeClampUV(uvG);
        uvB = safeClampUV(uvB);
        
        float sampledDepthR = texture2D(sceneDepth, uvR).r;
        float sampledDepthG = texture2D(sceneDepth, uvG).r;
        float sampledDepthB = texture2D(sceneDepth, uvB).r;
        
        vec3 worldPosAtDepthR = getWorldPositionFromDepth(uvR, sampledDepthR);
        vec3 worldPosAtDepthG = getWorldPositionFromDepth(uvG, sampledDepthG);
        vec3 worldPosAtDepthB = getWorldPositionFromDepth(uvB, sampledDepthB);
        
        float distToRefractedR = length(refractedWorldPosR - cameraPosition);
        float distToRefractedG = length(refractedWorldPosG - cameraPosition);
        float distToRefractedB = length(refractedWorldPosB - cameraPosition);
        
        float distToSceneR = length(worldPosAtDepthR - cameraPosition);
        float distToSceneG = length(worldPosAtDepthG - cameraPosition);
        float distToSceneB = length(worldPosAtDepthB - cameraPosition);
        
        float depthBias = 0.01;
        
        vec3 sampleR, sampleG, sampleB;
        
        if (validR && distToSceneR > distToRefractedR - depthBias) {
            sampleR = texture2D(transmissionSamplerMap, uvR).rgb * envIntensity;
        } else {
            sampleR = texture2D(transmissionSamplerMap, directUV).rgb * envIntensity;
        }
        
        if (validG && distToSceneG > distToRefractedG - depthBias) {
            sampleG = texture2D(transmissionSamplerMap, uvG).rgb * envIntensity;
        } else {
            sampleG = texture2D(transmissionSamplerMap, directUV).rgb * envIntensity;
        }
        
        if (validB && distToSceneB > distToRefractedB - depthBias) {
            sampleB = texture2D(transmissionSamplerMap, uvB).rgb * envIntensity;
        } else {
            sampleB = texture2D(transmissionSamplerMap, directUV).rgb * envIntensity;
        }
        
        float attenuationDist = 0.5;
        sampleR = applyVolumeAttenuation(sampleR, thickness1, absorptionColor, attenuationDist, colorIntensity);
        sampleG = applyVolumeAttenuation(sampleG, thickness1, absorptionColor, attenuationDist, colorIntensity);
        sampleB = applyVolumeAttenuation(sampleB, thickness1, absorptionColor, attenuationDist, colorIntensity);
        
        transmission.r += sampleR.r;
        transmission.g += sampleG.g;
        transmission.b += sampleB.b;
        
        validSamples++;
    }
    
    tirFactor = tirFactor / float(adaptiveSamples);
    
    if (validSamples > 0) {
        return transmission / float(validSamples);
    } else {
        vec2 directUV = worldToScreen(fragWorldPos);
        return texture2D(transmissionSamplerMap, directUV).rgb * envIntensity;
    }
}

mat4 rotationMatrix(vec3 axis, float angle) {
    axis = normalize(axis);
    float s = sin(angle);
    float c = cos(angle);
    float oc = 1.0 - c;
    
    return mat4(oc * axis.x * axis.x + c,           oc * axis.x * axis.y - axis.z * s,  oc * axis.z * axis.x + axis.y * s,  0.0,
                oc * axis.x * axis.y + axis.z * s,  oc * axis.y * axis.y + c,           oc * axis.y * axis.z - axis.x * s,  0.0,
                oc * axis.z * axis.x - axis.y * s,  oc * axis.y * axis.z + axis.x * s,  oc * axis.z * axis.z + c,           0.0,
                0.0,                                0.0,                                0.0,                                1.0);
}

void main() {
    vec3 geometryNormal = gl_FrontFacing ? normalize(vNormal) : -normalize(vNormal);
    vec3 N = geometryNormal;
    
    if (useNormalMap) {
        vec3 normalMapSample = texture2D(normalMap, vUv).rgb;
        normalMapSample = normalMapSample * 2.0 - 1.0;
        normalMapSample.xy *= normalScale;
        normalMapSample = normalize(normalMapSample);
        
        mat3 TBN = calculateTBN(geometryNormal, vFragPos, vUv);
        N = normalize(TBN * normalMapSample);
        
        if (dot(N, geometryNormal) < 0.0) {
            N = -N;
        }
    }
    
    vec3 V = normalize(cameraPosition - vFragPos);
    float NdotV = abs(dot(N, V));
    
    vec3 R = reflect(-V, N);
    R = normalize((rotationMatrix(vec3(0.0, 1.0, 0.0), -1.0) * vec4(R.xyz, 0.0)).xyz);
    
    float thicknessSample;
    float actualThickness;
    if (hasThicknessMap) {
        thicknessSample = 0.25 * texture2D(thicknessMap, vUv).r;
        actualThickness = thicknessSample * 0.1;
    } else {
        thicknessSample = 1.0;
        actualThickness = thickness;
    }
    
    float tirFactor = 0.0;
    vec3 transmission = getEnhancedTransmission(N, V, actualThickness, ior, thicknessSample, gl_FrontFacing, NdotV, tirFactor);
    
    transmission *= (1.0 - absorptionPower);
    
    float F0 = pow((1.0 - ior) / (1.0 + ior), 2.0);
    float fresnel = fresnelSchlick(NdotV, F0) * 0.5;

    // Calculate edge mask
    float edgeMask = 0.0;
    
    if (useCurvatureMap) {
        vec3 curvatureSample = texture2D(curvatureMap, vUv).rgb;
        float curvature = length(curvatureSample - 0.5) * 2.0;
        
        float contrast = 1.05;
        float midpoint = 0.5;
        curvature = (curvature - midpoint) * contrast + midpoint;
        curvature = clamp(curvature, 0.0, 1.0);
        curvature *= curvatureScale;
        
        float viewAngleFactor = 1.0 - NdotV;
        viewAngleFactor = pow(viewAngleFactor, edgeReflectionPower);
        
        edgeMask = curvature * viewAngleFactor;
    } else {
        float edgeFactor = 1.0 - NdotV;
        
        if (edgeFactor > (1.0 - edgeReflectionWidth)) {
            float normalizedEdge = (edgeFactor - (1.0 - edgeReflectionWidth)) / edgeReflectionWidth;
            edgeMask = pow(normalizedEdge, edgeReflectionPower);
        }
    }

    // Apply reflections ONLY at edges with lighting influence
    vec3 reflection = vec3(0.0);
    vec3 edgeSpecular = vec3(0.0);
    
    if (enableReflections && edgeMask > 0.0) {
        vec3 rawReflection = textureCube(radiance, vec3(R.x, -R.y, R.z)).rgb * envIntensity;
        if (filterHDR) {
            reflection = extractBrightAreas(rawReflection, brightnessThreshold, brightnessSmoothing);
        } else {
            reflection = rawReflection;
        }
        
        // Calculate specular highlights specifically for edge reflections
        if (enableLighting) {
            // Point lights
            for (int i = 0; i < ` +
      maxLights +
      `; i++) {
                if (i >= numPointLights) break;
                
                vec3 L = pointLightPositions[i] - vFragPos;
                float distance = length(L);
                L = normalize(L);
                
                float attenuation = 1.0;
                if (pointLightDistances[i] > 0.0) {
                    attenuation = clamp(1.0 - (distance * distance) / (pointLightDistances[i] * pointLightDistances[i]), 0.0, 1.0);
                    attenuation *= attenuation;
                }
                
                vec3 H = normalize(L + V);
                float NdotH = max(dot(N, H), 0.0);
                float spec = pow(NdotH, 500.0);
                
                edgeSpecular += pointLightColors[i] * pointLightIntensities[i] * spec * attenuation;
            }
            
            // Directional lights
            for (int i = 0; i < ` +
      maxLights +
      `; i++) {
                if (i >= numDirectionalLights) break;
                
                vec3 L = -normalize(directionalLightDirections[i]);
                vec3 H = normalize(L + V);
                float NdotH = max(dot(N, H), 0.0);
                float spec = pow(NdotH, 500.0);
                
                edgeSpecular += directionalLightColors[i] * directionalLightIntensities[i] * spec;
            }
        }
        
        // Mix cubemap reflection with light specular based on edge mask
        reflection = mix(reflection, reflection + edgeSpecular * 2.0, edgeMask);
        reflection *= edgeMask * edgeReflectionIntensity;
    }

    // Calculate main specular highlights (for non-edge areas)
    vec3 specularHighlights = vec3(0.0);
    if (enableLighting) {
        // Point lights
        for (int i = 0; i < ` +
      maxLights +
      `; i++) {
            if (i >= numPointLights) break;
            
            vec3 L = pointLightPositions[i] - vFragPos;
            float distance = length(L);
            L = normalize(L);
            
            // Attenuation
            float attenuation = 1.0;
            if (pointLightDistances[i] > 0.0) {
                attenuation = clamp(1.0 - (distance * distance) / (pointLightDistances[i] * pointLightDistances[i]), 0.0, 1.0);
                attenuation *= attenuation;
            }
            
            // Blinn-Phong specular
            vec3 H = normalize(L + V);
            float NdotH = max(dot(N, H), 0.0);
            float spec = pow(NdotH, 500.0);
            
            specularHighlights += pointLightColors[i] * pointLightIntensities[i] * spec * attenuation * specularStrength * 100.0;
        }
        
        // Directional lights
        for (int i = 0; i < ` +
      maxLights +
      `; i++) {
            if (i >= numDirectionalLights) break;
            
            vec3 L = -normalize(directionalLightDirections[i]);
            
            // Blinn-Phong specular
            vec3 H = normalize(L + V);
            float NdotH = max(dot(N, H), 0.0);
            float largeSpec = pow(NdotH, 3000.0) * 0.5;


            float sharpSpec = pow(NdotH, 1000.0) * 2.0;
            //float spec = largeSpec + sharpSpec;
            float spec = pow(NdotH, 2500.0);
            
            specularHighlights += directionalLightColors[i] * directionalLightIntensities[i] * spec * specularStrength * 150.0;
        }
    }

    // Calculate diffuse-like brightening (for glass, this simulates light passing through)
    vec3 lightBrightening = vec3(0.0);
    // Point lights
    for (int i = 0; i < ` +
      maxLights +
      `; i++) {
        if (i >= numPointLights) break;
        
        vec3 L = pointLightPositions[i] - vFragPos;
        float distance = length(L);
        L = normalize(L);
        
        float attenuation = 1.0;
        if (pointLightDistances[i] > 0.0) {
            attenuation = clamp(1.0 - (distance * distance) / (pointLightDistances[i] * pointLightDistances[i]), 0.0, 1.0);
            attenuation *= attenuation;
        }
        
        float NdotL = max(dot(N, L), 0.0);
        lightBrightening += pointLightColors[i] * pointLightIntensities[i] * NdotL * attenuation * 0.005;
    }
    
    // Directional lights
    for (int i = 0; i < ` +
      maxLights +
      `; i++) {
        if (i >= numDirectionalLights) break;
        
        vec3 L = -normalize(directionalLightDirections[i]);
        float NdotL = max(dot(N, L), 0.0);
        lightBrightening += directionalLightColors[i] * directionalLightIntensities[i] * NdotL * 0.005;
    }

    // Position-based fresnel darkening effect
float positionDarkening = 1.0;
if (usePositionNormalMap) {
    // Sample the map directly as a grayscale/intensity value
    // Red channel can represent the darkening intensity
    float darkeningIntensity = texture2D(positionNormalMap, vUv).r;
    
    // Calculate base fresnel
    float baseFresnel = pow(1.0 - NdotV, positionFresnelPower);
    
    // Modulate fresnel effect by the map value
    float modulatedFresnel = baseFresnel * darkeningIntensity * positionFresnelIntensity;
    
    // Apply as darkening (multiply by 1.0 - fresnel effect)
    positionDarkening = 1.0 - modulatedFresnel;
    positionDarkening = clamp(positionDarkening, 0.0, 1.0);
}

    float transmissionAmount = (1.0 - fresnel) * transmissionIntensity;

    // Final color: reflection + transmission + specular
    vec3 finalColor = reflection + transmission * transmissionAmount + specularHighlights + lightBrightening;
    
    // Apply position-based darkening
    finalColor *= positionDarkening;

   
    gl_FragColor = vec4(finalColor, opacity);
}
`;

    const defaultAbsorptionColorObj = new THREE.Color(absorptionColor);

    const materialDepthWrite = isBackFace ? false : depthWrite;
    const materialDepthTest = depthTest;
    const materialSide = isBackFace ? THREE.BackSide : THREE.FrontSide;

    const size = gl.getSize(new THREE.Vector2());

    // Initialize empty arrays for lights
    const emptyVec3Array = new Array(maxLights)
      .fill(null)
      .map(() => new THREE.Vector3());
    const emptyFloatArray = new Array(maxLights).fill(0);

    const material = new THREE.ShaderMaterial({
      vertexShader: sceneVertexShader,
      fragmentShader: sceneFragmentShader,
      defines: useInstancing ? { USE_INSTANCING: "" } : {},
      uniforms: {
        transmissionSamplerMap: { value: null },
        sceneDepth: { value: null },
        thicknessMap: { value: thicknessMap },
        hasThicknessMap: { value: thicknessMap !== null },
        thickness: { value: thickness },
        reflectionIntensity: { value: reflectionIntensity },
        transmissionIntensity: { value: transmissionIntensity },
        radiance: { value: envMap },
        resolution: { value: new THREE.Vector2(size.x, size.y) },
        modelMatrix: { value: new THREE.Matrix4() },
        viewMatrix: { value: camera.matrixWorldInverse },
        projectionMatrix: { value: camera.projectionMatrix },
        absorptionPower: { value: absorptionPower },
        absorptionColor: {
          value: [
            defaultAbsorptionColorObj.r,
            defaultAbsorptionColorObj.g,
            defaultAbsorptionColorObj.b,
          ],
        },
        colorIntensity: { value: colorIntensity },
        chromaticAberration: { value: chromaticAberration },
        roughness: { value: roughness },
        samples: { value: samples },
        brightReflectionIntensity: { value: brightReflectionIntensity },
        specularHighlightIntensity: { value: specularHighlightIntensity },
        enableReflections: { value: enableReflections },
        envIntensity: { value: envIntensity },
        opacity: { value: opacity },
        ior: { value: ior },
        cameraNear: { value: camera.near },
        cameraFar: { value: camera.far },
        cameraPosition: { value: camera.position },
        brightnessThreshold: { value: brightnessThreshold },
        brightnessSmoothing: { value: brightnessSmoothing },
        filterHDR: { value: filterHDR },
        edgeReflectionIntensity: { value: edgeReflectionIntensity },
        edgeReflectionPower: { value: edgeReflectionPower },
        edgeReflectionWidth: { value: edgeReflectionWidth },
        normalMap: { value: normalMap },
        useNormalMap: { value: useNormalMap },
        normalScale: { value: normalScale },
        curvatureMap: { value: curvatureMap },
        useCurvatureMap: { value: useCurvatureMap },
        curvatureScale: { value: curvatureScale },
        // Lighting uniforms (specular only)
        enableLighting: { value: enableLighting },
        specularStrength: { value: specularStrength },
        shininess: { value: shininess },
        numPointLights: { value: 0 },
        pointLightPositions: { value: [...emptyVec3Array] },
        pointLightColors: { value: [...emptyVec3Array] },
        pointLightIntensities: { value: [...emptyFloatArray] },
        pointLightDistances: { value: [...emptyFloatArray] },
        numDirectionalLights: { value: 0 },
        directionalLightDirections: { value: [...emptyVec3Array] },
        directionalLightColors: { value: [...emptyVec3Array] },
        directionalLightIntensities: { value: [...emptyFloatArray] },
        positionNormalMap: { value: positionNormalMap },
        usePositionNormalMap: { value: usePositionNormalMap },
        positionFresnelPower: { value: positionFresnelPower },
        positionFresnelIntensity: { value: positionFresnelIntensity },
      },
      transparent: true,
      side: materialSide,
      depthWrite: materialDepthWrite,
      depthTest: materialDepthTest,
      renderOrder: renderOrder,
      toneMapped: false,
    });

    return material;
  }, [
    farPlaneZ,
    absorptionColor,
    gl,
    camera,
    renderOrder,
    depthWrite,
    brightnessThreshold,
    brightnessSmoothing,
    filterHDR,
    edgeReflectionIntensity,
    edgeReflectionPower,
    edgeReflectionWidth,
    normalMap,
    useNormalMap,
    normalScale,
    curvatureMap,
    useCurvatureMap,
    curvatureScale,
    enableLighting,
    specularStrength,
    shininess,
    maxLights,
    useInstancing,
  ]);

  glassMaterial.userData = { shellLayer, isBackFace };

  // Update material uniforms when props change
  useEffect(() => {
    if (glassMaterial && glassMaterial.uniforms) {
      if (glassMaterial.uniforms.absorptionPower)
        glassMaterial.uniforms.absorptionPower.value = absorptionPower;
      if (glassMaterial.uniforms.colorIntensity)
        glassMaterial.uniforms.colorIntensity.value = colorIntensity;
      if (glassMaterial.uniforms.chromaticAberration)
        glassMaterial.uniforms.chromaticAberration.value = chromaticAberration;
      if (glassMaterial.uniforms.roughness)
        glassMaterial.uniforms.roughness.value = roughness;
      if (glassMaterial.uniforms.samples)
        glassMaterial.uniforms.samples.value = samples;
      if (glassMaterial.uniforms.brightReflectionIntensity)
        glassMaterial.uniforms.brightReflectionIntensity.value =
          brightReflectionIntensity;
      if (glassMaterial.uniforms.specularHighlightIntensity)
        glassMaterial.uniforms.specularHighlightIntensity.value =
          specularHighlightIntensity;
      if (glassMaterial.uniforms.enableReflections)
        glassMaterial.uniforms.enableReflections.value = enableReflections;
      if (glassMaterial.uniforms.envIntensity)
        glassMaterial.uniforms.envIntensity.value = envIntensity;
      if (glassMaterial.uniforms.opacity)
        glassMaterial.uniforms.opacity.value = opacity;
      if (glassMaterial.uniforms.ior) glassMaterial.uniforms.ior.value = ior;
      if (glassMaterial.uniforms.thickness)
        glassMaterial.uniforms.thickness.value = thickness;
      if (glassMaterial.uniforms.thicknessMap)
        glassMaterial.uniforms.thicknessMap.value = thicknessMap;
      if (glassMaterial.uniforms.hasThicknessMap)
        glassMaterial.uniforms.hasThicknessMap.value = thicknessMap !== null;
      if (glassMaterial.uniforms.reflectionIntensity)
        glassMaterial.uniforms.reflectionIntensity.value = reflectionIntensity;
      if (glassMaterial.uniforms.transmissionIntensity)
        glassMaterial.uniforms.transmissionIntensity.value =
          transmissionIntensity;
      if (glassMaterial.uniforms.brightnessThreshold)
        glassMaterial.uniforms.brightnessThreshold.value = brightnessThreshold;
      if (glassMaterial.uniforms.brightnessSmoothing)
        glassMaterial.uniforms.brightnessSmoothing.value = brightnessSmoothing;
      if (glassMaterial.uniforms.filterHDR)
        glassMaterial.uniforms.filterHDR.value = filterHDR;
      if (glassMaterial.uniforms.cameraNear)
        glassMaterial.uniforms.cameraNear.value = camera.near;
      if (glassMaterial.uniforms.cameraFar)
        glassMaterial.uniforms.cameraFar.value = camera.far;
      if (glassMaterial.uniforms.cameraPosition)
        glassMaterial.uniforms.cameraPosition.value.copy(camera.position);
      if (glassMaterial.uniforms.edgeReflectionIntensity)
        glassMaterial.uniforms.edgeReflectionIntensity.value =
          edgeReflectionIntensity;
      if (glassMaterial.uniforms.edgeReflectionPower)
        glassMaterial.uniforms.edgeReflectionPower.value = edgeReflectionPower;
      if (glassMaterial.uniforms.edgeReflectionWidth)
        glassMaterial.uniforms.edgeReflectionWidth.value = edgeReflectionWidth;
      if (glassMaterial.uniforms.normalMap)
        glassMaterial.uniforms.normalMap.value = normalMap;
      if (glassMaterial.uniforms.useNormalMap)
        glassMaterial.uniforms.useNormalMap.value = useNormalMap;
      if (glassMaterial.uniforms.normalScale)
        glassMaterial.uniforms.normalScale.value = normalScale;
      if (glassMaterial.uniforms.curvatureMap)
        glassMaterial.uniforms.curvatureMap.value = curvatureMap;
      if (glassMaterial.uniforms.useCurvatureMap)
        glassMaterial.uniforms.useCurvatureMap.value = useCurvatureMap;
      if (glassMaterial.uniforms.curvatureScale)
        glassMaterial.uniforms.curvatureScale.value = curvatureScale;
      if (glassMaterial.uniforms.enableLighting)
        glassMaterial.uniforms.enableLighting.value = enableLighting;
      if (glassMaterial.uniforms.specularStrength)
        glassMaterial.uniforms.specularStrength.value = specularStrength;
      if (glassMaterial.uniforms.shininess)
        glassMaterial.uniforms.shininess.value = shininess;
      if (glassMaterial.uniforms.positionNormalMap)
        glassMaterial.uniforms.positionNormalMap.value = positionNormalMap;
      if (glassMaterial.uniforms.usePositionNormalMap)
        glassMaterial.uniforms.usePositionNormalMap.value =
          usePositionNormalMap;
      if (glassMaterial.uniforms.positionFresnelPower)
        glassMaterial.uniforms.positionFresnelPower.value =
          positionFresnelPower;
      if (glassMaterial.uniforms.positionFresnelIntensity)
        glassMaterial.uniforms.positionFresnelIntensity.value =
          positionFresnelIntensity;
      const colorObj = new THREE.Color(absorptionColor);
      if (glassMaterial.uniforms.absorptionColor) {
        glassMaterial.uniforms.absorptionColor.value = [
          colorObj.r,
          colorObj.g,
          colorObj.b,
        ];
      }
    }
  }, [
    glassMaterial,
    absorptionPower,
    colorIntensity,
    reflectionIntensity,
    transmissionIntensity,
    chromaticAberration,
    roughness,
    samples,
    absorptionColor,
    brightReflectionIntensity,
    specularHighlightIntensity,
    enableReflections,
    envIntensity,
    opacity,
    ior,
    thickness,
    thicknessMap,
    brightnessThreshold,
    brightnessSmoothing,
    filterHDR,
    edgeReflectionIntensity,
    edgeReflectionPower,
    edgeReflectionWidth,
    camera,
    normalMap,
    useNormalMap,
    normalScale,
    curvatureMap,
    useCurvatureMap,
    curvatureScale,
    enableLighting,
    specularStrength,
    shininess,
    positionNormalMap,
    usePositionNormalMap,
    positionFresnelPower,
    positionFresnelIntensity,
  ]);

  // Update environment map and background scene
  useEffect(() => {
    if (
      glassMaterial &&
      glassMaterial.uniforms &&
      glassMaterial.uniforms.radiance &&
      envMap
    ) {
      glassMaterial.uniforms.radiance.value = envMap;
    }

    if (backgroundScene && envMap) {
      backgroundScene.traverse((obj) => {
        if (obj.isMesh && obj.material && obj.material.uniforms) {
          if (obj.material.uniforms.envMap) {
            obj.material.uniforms.envMap.value = envMap;
          }
          if (obj.material.uniforms.brightnessThreshold) {
            obj.material.uniforms.brightnessThreshold.value =
              brightnessThreshold;
          }
          if (obj.material.uniforms.brightnessSmoothing) {
            obj.material.uniforms.brightnessSmoothing.value =
              brightnessSmoothing;
          }
          if (obj.material.uniforms.filterHDR) {
            obj.material.uniforms.filterHDR.value = filterHDR;
          }
        }
      });
    }
  }, [
    glassMaterial,
    envMap,
    backgroundScene,
    brightnessThreshold,
    brightnessSmoothing,
    filterHDR,
  ]);

  const TRANSMISSION_LAYER = 1;
  const NORMAL_LAYER = 0;

  useFrame((state) => {
    if (glassMaterial && glassMaterial.uniforms) {
      // Update camera matrices and position
      if (glassMaterial.uniforms.viewMatrix) {
        glassMaterial.uniforms.viewMatrix.value.copy(camera.matrixWorldInverse);
      }
      if (glassMaterial.uniforms.projectionMatrix) {
        glassMaterial.uniforms.projectionMatrix.value.copy(
          camera.projectionMatrix
        );
      }
      if (glassMaterial.uniforms.cameraPosition) {
        glassMaterial.uniforms.cameraPosition.value.copy(camera.position);
      }

      // Update light uniforms from scene
      if (enableLighting) {
        const pointLights = [];
        const directionalLights = [];

        // Helper function to check if light should be included
        const shouldIncludeLight = (light) => {
          if (!enabledLightNames || enabledLightNames.length === 0) {
            return true; // Include all lights if no filter specified
          }
          return enabledLightNames.includes(light.name);
        };

        scene.traverse((obj) => {
          if (
            obj.isPointLight &&
            pointLights.length < maxLights &&
            shouldIncludeLight(obj)
          ) {
            pointLights.push(obj);
          } else if (
            obj.isDirectionalLight &&
            directionalLights.length < maxLights &&
            shouldIncludeLight(obj)
          ) {
            directionalLights.push(obj);
          }
        });

        // Update point lights
        const pointPositions = new Array(maxLights)
          .fill(null)
          .map(() => new THREE.Vector3());
        const pointColors = new Array(maxLights)
          .fill(null)
          .map(() => new THREE.Vector3());
        const pointIntensities = new Array(maxLights).fill(0);
        const pointDistances = new Array(maxLights).fill(0);

        pointLights.forEach((light, i) => {
          pointPositions[i].copy(light.position);
          pointColors[i].set(light.color.r, light.color.g, light.color.b);
          pointIntensities[i] = light.intensity;
          pointDistances[i] = light.distance;
        });

        glassMaterial.uniforms.numPointLights.value = pointLights.length;
        glassMaterial.uniforms.pointLightPositions.value = pointPositions;
        glassMaterial.uniforms.pointLightColors.value = pointColors;
        glassMaterial.uniforms.pointLightIntensities.value = pointIntensities;
        glassMaterial.uniforms.pointLightDistances.value = pointDistances;

        // Update directional lights
        const dirDirections = new Array(maxLights)
          .fill(null)
          .map(() => new THREE.Vector3());
        const dirColors = new Array(maxLights)
          .fill(null)
          .map(() => new THREE.Vector3());
        const dirIntensities = new Array(maxLights).fill(0);

        directionalLights.forEach((light, i) => {
          const lightWorldPos = new THREE.Vector3();
          light.getWorldPosition(lightWorldPos);

          // Get the target's world position
          const targetWorldPos = new THREE.Vector3();
          light.target.getWorldPosition(targetWorldPos);

          // Calculate direction from light to target
          dirDirections[i]
            .subVectors(targetWorldPos, lightWorldPos)
            .normalize();

          dirColors[i].set(light.color.r, light.color.g, light.color.b);
          dirIntensities[i] = light.intensity;
        });

        glassMaterial.uniforms.numDirectionalLights.value =
          directionalLights.length;
        glassMaterial.uniforms.directionalLightDirections.value = dirDirections;
        glassMaterial.uniforms.directionalLightColors.value = dirColors;
        glassMaterial.uniforms.directionalLightIntensities.value =
          dirIntensities;
      }

      const currentRenderTarget = gl.getRenderTarget();
      const originalBackground = scene.background;
      const originalEnvironment = scene.environment;
      const originalCameraLayers = camera.layers.mask;
      const excludedObjects = [];

      const glassMeshesByLayer = new Map();
      scene.traverse((obj) => {
        if (
          obj.isMesh &&
          obj.material &&
          obj.material.userData &&
          obj.material.userData.shellLayer !== undefined
        ) {
          const layer = obj.material.userData.shellLayer;
          const isBack = obj.material.userData.isBackFace || false;
          const key = `${layer}_${isBack ? "back" : "front"}`;

          if (!glassMeshesByLayer.has(key)) {
            glassMeshesByLayer.set(key, []);
          }
          glassMeshesByLayer.get(key).push(obj);
        }

        if (obj.userData.excludeFromGlass) {
          excludedObjects.push(obj);
          obj.visible = false;
        }
      });

      const allKeys = Array.from(glassMeshesByLayer.keys());
      const layers = [
        ...new Set(allKeys.map((k) => parseInt(k.split("_")[0]))),
      ].sort((a, b) => a - b);

      const currentKey = `${shellLayer}_${isBackFace ? "back" : "front"}`;
      if (!glassMeshesByLayer.has(currentKey)) return;

      camera.layers.set(NORMAL_LAYER);
      camera.layers.enable(TRANSMISSION_LAYER);

      const currentLayerIndex = layers.indexOf(shellLayer);

      const meshesToHide = [];

      if (isBackFace) {
        for (let i = 0; i <= currentLayerIndex; i++) {
          const frontKey = `${layers[i]}_front`;
          const backKey = `${layers[i]}_back`;

          if (glassMeshesByLayer.has(frontKey)) {
            meshesToHide.push(...glassMeshesByLayer.get(frontKey));
          }

          if (i < currentLayerIndex && glassMeshesByLayer.has(backKey)) {
            meshesToHide.push(...glassMeshesByLayer.get(backKey));
          }
        }
      } else {
        for (let i = 0; i <= currentLayerIndex; i++) {
          const frontKey = `${layers[i]}_front`;
          const backKey = `${layers[i]}_back`;

          if (glassMeshesByLayer.has(frontKey)) {
            meshesToHide.push(...glassMeshesByLayer.get(frontKey));
          }
          if (glassMeshesByLayer.has(backKey)) {
            meshesToHide.push(...glassMeshesByLayer.get(backKey));
          }
        }
      }

      meshesToHide.forEach((mesh) => {
        mesh.visible = false;
      });

      gl.setRenderTarget(transmissionRenderTarget);
      gl.clear();

      gl.render(backgroundScene, camera);
      gl.render(scene, camera);

      const currentMeshes = glassMeshesByLayer.get(currentKey);
      if (currentMeshes) {
        currentMeshes.forEach((mesh) => {
          mesh.visible = true;
        });
      }

      excludedObjects.forEach((obj) => {
        obj.visible = true;
      });

      glassMaterial.uniforms.transmissionSamplerMap.value =
        transmissionRenderTarget.texture;
      glassMaterial.uniforms.sceneDepth.value =
        transmissionRenderTarget.depthTexture;

      glassMeshesByLayer.forEach((meshes) => {
        meshes.forEach((mesh) => {
          mesh.visible = true;
        });
      });

      camera.layers.mask = originalCameraLayers;
      scene.background = originalBackground;
      scene.environment = originalEnvironment;
      gl.setRenderTarget(currentRenderTarget);
    }
  });

  useEffect(() => {
    return () => {
      transmissionRenderTarget.dispose();
      if (transmissionRenderTarget.depthTexture) {
        transmissionRenderTarget.depthTexture.dispose();
      }
      depthRenderTarget.dispose();
      if (backgroundScene) {
        backgroundScene.traverse((obj) => {
          if (obj.geometry) obj.geometry.dispose();
          if (obj.material) obj.material.dispose();
        });
      }
    };
  }, [transmissionRenderTarget, depthRenderTarget, backgroundScene]);

  return glassMaterial;
}

// React component
const CustomGlassMaterial = React.forwardRef(
  (
    {
      meshRef,
      envMap = null,
      thicknessMap = null,
      thickness = 0.04,
      absorptionColor = 0xd47d5a,
      absorptionPower = 0.1,
      colorIntensity = 1.0,
      reflectionIntensity = 0.9,
      transmissionIntensity = 0.6,
      chromaticAberration = 0.05,
      roughness = 0.0,
      samples = 3,
      farPlaneZ = 200,
      isInnerSurface = false,
      depthWrite = true,
      depthTest = true,
      brightReflectionIntensity = 0.3,
      specularHighlightIntensity = 0.5,
      enableReflections = false,
      envIntensity = 2.0,
      opacity = 1.0,
      ior = 1.5,
      renderOrder = 0,
      shellLayer = 0,
      isBackFace = false,
      brightnessThreshold = 0.5,
      brightnessSmoothing = 0.2,
      filterHDR = true,
      edgeReflectionIntensity = 3.0,
      edgeReflectionPower = 3.0,
      edgeReflectionWidth = 0.3,
      normalMap = null,
      useNormalMap = false,
      normalScale = 1.0,
      resolutionMultiplier = 2.0,
      curvatureMap = null,
      useCurvatureMap = false,
      curvatureScale = 1.0,
      enableLighting = true,
      specularStrength = 1.0,
      shininess = 64.0,
      maxLights = 3,
      positionNormalMap = null,
      usePositionNormalMap = false,
      positionFresnelPower = 1.0,
      positionFresnelIntensity = 1.0,
      enabledLightNames = null,
      useInstancing = false,
      ...props
    },
    ref
  ) => {
    const material = useCustomGlassMaterial({
      envMap,
      thicknessMap,
      thickness,
      absorptionColor,
      absorptionPower,
      colorIntensity,
      reflectionIntensity,
      transmissionIntensity,
      chromaticAberration,
      roughness,
      samples,
      farPlaneZ,
      isInnerSurface,
      depthWrite,
      depthTest,
      brightReflectionIntensity,
      specularHighlightIntensity,
      enableReflections,
      envIntensity,
      opacity,
      ior,
      renderOrder,
      shellLayer,
      isBackFace,
      brightnessThreshold,
      brightnessSmoothing,
      filterHDR,
      edgeReflectionIntensity,
      edgeReflectionPower,
      edgeReflectionWidth,
      normalMap,
      useNormalMap,
      normalScale,
      resolutionMultiplier,
      curvatureMap,
      useCurvatureMap,
      curvatureScale,
      enableLighting,
      specularStrength,
      shininess,
      maxLights,
      positionNormalMap,
      usePositionNormalMap,
      positionFresnelPower,
      positionFresnelIntensity,
      enabledLightNames,
      useInstancing,
    });

    useEffect(() => {
      if (ref) {
        if (typeof ref === "function") {
          ref(material);
        } else {
          ref.current = material;
        }
      }
    }, [material, ref]);

    return <primitive object={material} attach="material" {...props} />;
  }
);

CustomGlassMaterial.displayName = "CustomGlassMaterial";

export default CustomGlassMaterial;
