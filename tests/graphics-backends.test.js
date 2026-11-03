import test from 'node:test';
import assert from 'node:assert/strict';
import {GRAPHICS_BACKENDS,graphicsBackendOrder,graphicsQuality} from '../src/graphics/graphicsCapabilities.js';

test('modern browsers negotiate WebGPU then WebGL2/WebGL1 and finally CPU or CSS fallbacks',()=>{
 assert.deepEqual(graphicsBackendOrder(),['webgpu','webgl2','webgl1','canvas2d','css']);
 assert.deepEqual([...GRAPHICS_BACKENDS],graphicsBackendOrder());
});
test('reduced-motion devices use a static non-animated CSS background',()=>{
 assert.deepEqual(graphicsBackendOrder({reducedMotion:true}),['css']);
});
test('low-resource and data-saver devices use a lower frame rate and pixel density',()=>{
 assert.deepEqual(graphicsQuality({cores:4,memory:4,saveData:false,coarsePointer:true}),
  {fps:24,dpr:1});
 assert.deepEqual(graphicsQuality({cores:8,memory:8,saveData:true}),
  {fps:24,dpr:1});
});
test('high-capability and ordinary touch devices use bounded graphics quality',()=>{
 assert.deepEqual(graphicsQuality({cores:8,memory:8,saveData:false,coarsePointer:false}),
  {fps:45,dpr:1.6});
 assert.deepEqual(graphicsQuality({cores:8,memory:8,saveData:false,coarsePointer:true}),
  {fps:30,dpr:1.3});
});
