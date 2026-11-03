import {GRAPHICS_BACKENDS,graphicsBackendOrder,graphicsQuality} from './graphicsCapabilities.js';

const WGSL=`
struct Uniforms { time: f32, width: f32, height: f32, padding: f32 }
@group(0) @binding(0) var<uniform> u: Uniforms;
struct VertexOut {
 @builtin(position) position: vec4f,
 @location(0) uv: vec2f,
}
@vertex fn vs(@builtin(vertex_index) index: u32) -> VertexOut {
 var positions=array<vec2f,3>(
  vec2f(-1.0,-1.0),vec2f(3.0,-1.0),vec2f(-1.0,3.0)
 );
 var out: VertexOut;
 out.position=vec4f(positions[index],0.0,1.0);
 out.uv=(positions[index]+vec2f(1.0,1.0))*0.5;
 return out;
}
fn hash(p:vec2f)->f32 {
 return fract(sin(dot(p,vec2f(127.1,311.7)))*43758.5453);
}
@fragment fn fs(in:VertexOut)->@location(0) vec4f {
 let ratio=clamp(u.width/max(1.0,u.height),0.7,2.8);
 let p=in.uv;
 let relative=(p-vec2f(0.5,0.48))*vec2f(ratio,1.0);
 let glow=exp(-5.5*length(relative))*(0.07+0.015*sin(u.time*0.55));
 let grid=p*vec2f(18.0*ratio,11.0);
 let cell=floor(grid);
 let star=select(0.0,1.0,hash(cell)>0.95);
 let twinkle=0.16+0.07*sin(u.time*0.75+hash(cell)*6.283185);
 let point=star*(1.0-smoothstep(0.0,0.12,length(fract(grid)-vec2f(0.5,0.5))))*twinkle;
 let alpha=clamp(glow+point,0.0,0.26);
 return vec4f(vec3f(0.02,0.82,1.0)*alpha,alpha);
}
`;
const FRAGMENT_BODY=`
 float ratio=clamp(u_resolution.x/max(1.0,u_resolution.y),0.7,2.8);
 vec2 relative=(v_uv-vec2(0.5,0.48))*vec2(ratio,1.0);
 float glow=exp(-5.5*length(relative))*(0.07+0.015*sin(u_time*0.55));
 vec2 grid=v_uv*vec2(18.0*ratio,11.0);
 vec2 cell=floor(grid);
 float star=step(0.95,hash(cell));
 float twinkle=0.16+0.07*sin(u_time*0.75+hash(cell)*6.283185);
 float point=star*(1.0-smoothstep(0.0,0.12,length(fract(grid)-vec2(0.5))))*twinkle;
 float alpha=clamp(glow+point,0.0,0.26);
 return vec4(vec3(0.02,0.82,1.0)*alpha,alpha);
`;
const glslHash='float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}';
const GL2_VERTEX=`#version 300 es
precision highp float;
out vec2 v_uv;
void main(){
 vec2 p=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2));
 v_uv=p;
 gl_Position=vec4(p*2.0-1.0,0.0,1.0);
}`;
const GL1_VERTEX=`attribute vec2 a_pos;
varying vec2 v_uv;
void main(){v_uv=(a_pos+1.0)*0.5;gl_Position=vec4(a_pos,0.0,1.0);}`;
const GL2_FRAGMENT=`#version 300 es
precision highp float;
in vec2 v_uv;uniform float u_time;uniform vec2 u_resolution;
out vec4 outColor;
${glslHash}
void main(){${FRAGMENT_BODY}outColor=vec4(vec3(0.02,0.82,1.0)*alpha,alpha);}`;
const GL1_FRAGMENT=`precision highp float;
varying vec2 v_uv;uniform float u_time;uniform vec2 u_resolution;
${glslHash}
void main(){${FRAGMENT_BODY}gl_FragColor=vec4(vec3(0.02,0.82,1.0)*alpha,alpha);}`;

async function createWebGPU(canvas){
 if(!globalThis.isSecureContext||!navigator.gpu?.requestAdapter)return null;
 const adapter=await navigator.gpu.requestAdapter({powerPreference:'low-power'});
 if(!adapter)return null;
 const device=await adapter.requestDevice();
 const context=canvas.getContext('webgpu');
 if(!context){device.destroy();return null;}
 const format=navigator.gpu.getPreferredCanvasFormat();
 context.configure({device,format,alphaMode:'premultiplied'});
 const shader=device.createShaderModule({code:WGSL});
 const pipeline=device.createRenderPipeline({
  layout:'auto',vertex:{module:shader,entryPoint:'vs'},
  fragment:{module:shader,entryPoint:'fs',targets:[{
   format,blend:{color:{operation:'add',srcFactor:'one',dstFactor:'one-minus-src-alpha'},
    alpha:{operation:'add',srcFactor:'one',dstFactor:'one-minus-src-alpha'}}
  }]},primitive:{topology:'triangle-list'}
 });
 const uniform=device.createBuffer({size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
 const bindings=device.createBindGroup({layout:pipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:uniform}}]});
 return {
  lost:device.lost,
  render(seconds){
   device.queue.writeBuffer(uniform,0,new Float32Array([seconds,canvas.width,canvas.height,0]));
   const encoder=device.createCommandEncoder();
   const pass=encoder.beginRenderPass({colorAttachments:[{
    view:context.getCurrentTexture().createView(),loadOp:'clear',storeOp:'store',
    clearValue:{r:0,g:0,b:0,a:0}
   }]});
   pass.setPipeline(pipeline);pass.setBindGroup(0,bindings);pass.draw(3);pass.end();
   device.queue.submit([encoder.finish()]);
  },
  dispose(){uniform.destroy();device.destroy();}
 };
}
function shader(gl,type,source){
 const compiled=gl.createShader(type);
 if(!compiled)throw Error('GPU shader unavailable');
 gl.shaderSource(compiled,source);
 gl.compileShader(compiled);
 if(!gl.getShaderParameter(compiled,gl.COMPILE_STATUS)){
  const message=gl.getShaderInfoLog(compiled);
  gl.deleteShader(compiled);throw Error(message||'Shader compile failed');
 }
 return compiled;
}
function createWebGL(canvas,version){
 const kind=version===2?'webgl2':'webgl';
 const gl=canvas.getContext(kind,{alpha:true,antialias:false,depth:false,stencil:false,
  premultipliedAlpha:true,failIfMajorPerformanceCaveat:false,powerPreference:'low-power'});
 if(!gl)return null;
 const vertex=shader(gl,gl.VERTEX_SHADER,version===2?GL2_VERTEX:GL1_VERTEX);
 const fragment=shader(gl,gl.FRAGMENT_SHADER,version===2?GL2_FRAGMENT:GL1_FRAGMENT);
 const program=gl.createProgram();
 gl.attachShader(program,vertex);gl.attachShader(program,fragment);gl.linkProgram(program);
 gl.deleteShader(vertex);gl.deleteShader(fragment);
 if(!gl.getProgramParameter(program,gl.LINK_STATUS)){
  const message=gl.getProgramInfoLog(program);gl.deleteProgram(program);throw Error(message||'Shader link failed');
 }
 const uTime=gl.getUniformLocation(program,'u_time');
 const uResolution=gl.getUniformLocation(program,'u_resolution');
 let buffer=null;
 if(version===1){
  buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
  const location=gl.getAttribLocation(program,'a_pos');
  gl.enableVertexAttribArray(location);gl.vertexAttribPointer(location,2,gl.FLOAT,false,0,0);
 }
 let lost;
 const lostPromise=new Promise(resolve=>{lost=event=>{event.preventDefault();resolve();};});
 canvas.addEventListener('webglcontextlost',lost);
 gl.enable(gl.BLEND);
 gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
 return {
  lost:lostPromise,
  render(seconds){
   if(gl.isContextLost())return;
   gl.viewport(0,0,canvas.width,canvas.height);
   gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);
   gl.useProgram(program);
   gl.uniform1f(uTime,seconds);gl.uniform2f(uResolution,canvas.width,canvas.height);
   gl.drawArrays(gl.TRIANGLES,0,3);
  },
  dispose(){
   canvas.removeEventListener('webglcontextlost',lost);
   if(buffer)gl.deleteBuffer(buffer);
   gl.deleteProgram(program);
   gl.getExtension('WEBGL_lose_context')?.loseContext();
  }
 };
}
function createCanvas2D(canvas){
 const context=canvas.getContext('2d',{alpha:true});
 if(!context)return null;
 return {
  render(seconds){
   const {width,height}=canvas;
   context.clearRect(0,0,width,height);
   const glow=context.createRadialGradient(width*.5,height*.5,1,width*.5,height*.5,
    Math.max(width,height)*.58);
   glow.addColorStop(0,'rgba(0,210,255,0.09)');
   glow.addColorStop(1,'rgba(0,210,255,0)');
   context.fillStyle=glow;context.fillRect(0,0,width,height);
   const count=Math.max(8,Math.min(30,Math.floor(width/28)));
   for(let i=0;i<count;i++){
    const x=((i*73+17)%101)/101*width;
    const y=((i*47+31)%97)/97*height;
    context.globalAlpha=.08+.07*(.5+.5*Math.sin(seconds*.75+i));
    context.fillStyle='#00cfee';context.beginPath();
    context.arc(x,y,Math.max(.5,width/850),0,Math.PI*2);context.fill();
   }
   context.globalAlpha=1;
  },
  dispose(){context.clearRect(0,0,canvas.width,canvas.height);}
 };
}
async function createBackend(name,canvas){
 if(name==='webgpu')return createWebGPU(canvas);
 if(name==='webgl2')return createWebGL(canvas,2);
 if(name==='webgl1')return createWebGL(canvas,1);
 if(name==='canvas2d')return createCanvas2D(canvas);
 return null;
}

// The renderer is isolated from the economy and all input events.
export function mountAdaptiveGraphics(host,{reducedMotion=false,onBackend=()=>{}}={}){
 const connection=navigator.connection||navigator.mozConnection||navigator.webkitConnection;
 const quality=graphicsQuality({cores:navigator.hardwareConcurrency,
  memory:navigator.deviceMemory,saveData:connection?.saveData,
  coarsePointer:window.matchMedia?.('(pointer: coarse)').matches});
 const order=graphicsBackendOrder({reducedMotion});
 let disposed=false,scene=null,canvas=null,frameId=0,attemptId=0,lastFrame=0,activeBackend='css';
 const announce=name=>{
  activeBackend=name;host.dataset.graphicsBackend=name;
  document.documentElement.dataset.puppyGraphicsBackend=name;
  onBackend(name);
 };
 const resize=()=>{
  if(!canvas||!scene)return;
  const bounds=host.getBoundingClientRect();
  const width=Math.max(1,Math.min(2048,Math.round(bounds.width*quality.dpr)));
  const height=Math.max(1,Math.min(2048,Math.round(bounds.height*quality.dpr)));
  if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}
 };
 const render=now=>{
  frameId=0;
  if(disposed||!scene||document.hidden)return;
  if(now-lastFrame>=1000/quality.fps){
   lastFrame=now;
   try{resize();scene.render(now/1000);}
   catch{void attempt(order.indexOf(activeBackend)+1);return;}
  }
  frameId=requestAnimationFrame(render);
 };
 const stopFrame=()=>{if(frameId)cancelAnimationFrame(frameId);frameId=0;};
 const stopScene=()=>{
  stopFrame();
  try{scene?.dispose();}catch{}
  scene=null;canvas=null;
 };
 const attempt=async startIndex=>{
  const id=++attemptId;
  stopScene();
  for(let index=startIndex;index<order.length&&!disposed&&id===attemptId;index++){
   const name=order[index];
   host.replaceChildren();
   if(name==='css'){announce('css');return;}
   const candidate=document.createElement('canvas');
   candidate.setAttribute('aria-hidden','true');
   candidate.style.cssText='width:100%;height:100%;display:block;pointer-events:none';
   host.append(candidate);
   try{
    const built=await createBackend(name,candidate);
    if(disposed||id!==attemptId){try{built?.dispose();}catch{}return;}
    if(!built){candidate.remove();continue;}
    scene=built;canvas=candidate;
    announce(name);resize();
    built.lost?.then(()=>{
     if(!disposed&&id===attemptId)void attempt(index+1);
    }).catch(()=>{if(!disposed&&id===attemptId)void attempt(index+1);});
    if(!document.hidden)frameId=requestAnimationFrame(render);
    return;
   }catch{candidate.remove();}
  }
  if(!disposed&&id===attemptId){host.replaceChildren();announce('css');}
 };
 const onVisibility=()=>{
  if(document.hidden)stopFrame();
  else if(scene&&!frameId){lastFrame=0;frameId=requestAnimationFrame(render);}
 };
 const observer=typeof ResizeObserver!=='undefined'?new ResizeObserver(resize):null;
 observer?.observe(host);
 window.addEventListener('resize',resize);
 document.addEventListener('visibilitychange',onVisibility);
 void attempt(0);
 return ()=>{
  disposed=true;attemptId++;observer?.disconnect();
  window.removeEventListener('resize',resize);
  document.removeEventListener('visibilitychange',onVisibility);
  stopScene();host.replaceChildren();
  delete host.dataset.graphicsBackend;
  delete document.documentElement.dataset.puppyGraphicsBackend;
 };
}
export {GRAPHICS_BACKENDS};
