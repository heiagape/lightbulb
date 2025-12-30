import { useState, useEffect } from "react";

// Shared material type state (can be accessed by both Branch and Stem)
let globalMaterialType = "Gold";
const materialTypeListeners = new Set();

export const setGlobalMaterialType = (type) => {
  globalMaterialType = type;
  materialTypeListeners.forEach((listener) => listener(type));
};

export const useMaterialType = () => {
  const [materialType, setMaterialType] = useState(globalMaterialType);
  
  useEffect(() => {
    const listener = (type) => setMaterialType(type);
    materialTypeListeners.add(listener);
    return () => materialTypeListeners.delete(listener);
  }, []);
  
  return materialType;
};

