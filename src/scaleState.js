import { useState, useEffect } from "react";

// Shared scale state for mesh 363 (can be accessed by both Branch and Stem)
let globalMesh363Scale = 1.0;
const mesh363ScaleListeners = new Set();

export const setGlobalMesh363Scale = (scale) => {
  globalMesh363Scale = scale;
  mesh363ScaleListeners.forEach((listener) => listener(scale));
};

export const useMesh363Scale = () => {
  const [mesh363Scale, setMesh363Scale] = useState(globalMesh363Scale);
  
  useEffect(() => {
    const listener = (scale) => setMesh363Scale(scale);
    mesh363ScaleListeners.add(listener);
    return () => mesh363ScaleListeners.delete(listener);
  }, []);
  
  return mesh363Scale;
};
