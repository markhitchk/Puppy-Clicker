import test from 'node:test';
import assert from 'node:assert/strict';
import {deriveTemplate, constrainPixels, floodRegion} from '../src/pupCreatorMask.js';

const rgba=(w,h,fn)=>Uint8ClampedArray.from(Array.from({length:w*h},(_,i)=>fn(i%w,Math.floor(i/w))).flat());
test('template keeps source alpha and leaves transparent margins outside outline',()=>{
 const source=rgba(7,7,(x,y)=>[240,200,20,x>=2&&x<=4&&y>=2&&y<=4?(x===2?128:255):0]);
 const {mask,outline}=deriveTemplate(source,7,7);
 assert.equal(mask[3*7+2],128);assert.equal(mask[0],0);
 assert.equal(outline[3],0);assert.ok(outline[(3*7+2)*4+3]>0);
 assert.equal(outline[(3*7+3)*4+3],0);
});
test('paint clipped to support and export respects antialiased alpha',()=>{
 const source=new Uint8ClampedArray([255,0,0,255,255,0,0,255,255,0,0,255]);
 const mask=new Uint8Array([0,128,255]);
 const editing=constrainPixels(source,mask,false);
 assert.deepEqual(Array.from(editing.filter((_,i)=>i%4===3)),[0,255,255]);
 const output=constrainPixels(editing,mask,true);
 assert.deepEqual(Array.from(output.filter((_,i)=>i%4===3)),[0,128,255]);
});
test('flood does not cross protected outline or transparent margin',()=>{
 const pixels=rgba(5,1,()=>[0,0,0,0]);
 const result=floodRegion(pixels,5,1,new Uint8Array([0,255,255,255,255]),new Uint8Array([0,0,255,0,0]),1,0,[255,0,0,255],18);
 assert.deepEqual(Array.from(result.filter((_,i)=>i%4===3)),[0,255,0,0,0]);
});
