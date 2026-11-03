// Browser-only graphics negotiation. WebGPU may map to Vulkan, Metal or Direct3D;
// the browser chooses the native backend. No user-agent sniffing is necessary.
export const GRAPHICS_BACKENDS=Object.freeze(['webgpu','webgl2','webgl1','canvas2d','css']);
export function graphicsBackendOrder({reducedMotion=false}={}){
 return reducedMotion?['css']:[...GRAPHICS_BACKENDS];
}
export function graphicsQuality({cores=8,memory=8,saveData=false,coarsePointer=false}={}){
 const constrained=saveData||(Number.isFinite(cores)&&cores<=4)||
  (Number.isFinite(memory)&&memory>0&&memory<=4);
 return {fps:constrained?24:coarsePointer?30:45,
  dpr:constrained?1:Math.min(1.6,coarsePointer?1.3:1.6)};
}
