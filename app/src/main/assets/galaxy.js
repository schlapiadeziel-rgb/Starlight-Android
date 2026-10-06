/* ESO/S. Brunier photographic panorama. Catalog markers remain separate.
   Galactic equirectangular image: l=0 at center, north up, l increases left. */
(function(root){
 'use strict';
 const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
 const clamp=x=>Math.max(0,Math.min(1,x));
 function uv(vector){
  const n=Math.hypot(...vector);if(!Number.isFinite(n)||n===0)return null;
  const u=.5-Math.atan2(vector[1],vector[0])/(2*Math.PI);
  return [((u%1)+1)%1,.5-Math.asin(Math.max(-1,Math.min(1,vector[2]/n)))/Math.PI];
 }
 // Inverse of SkyMath.projector, transformed to galactic coordinates.
 function frame(basis,axes,width,height,fov,roll=0){
  if(![width,height,fov,roll].every(Number.isFinite)||width<=0||height<=0||fov<=0||fov>=180)return null;
  const c=Math.cos(roll),s=Math.sin(roll);
  const right=basis.r.map((x,i)=>x*c-basis.u[i]*s),up=basis.u.map((x,i)=>x*c+basis.r[i]*s);
  return {right:axes.map(a=>dot(right,a)),up:axes.map(a=>dot(up,a)),forward:axes.map(a=>dot(basis.f,a)),
   vertical:[right[2],up[2],basis.f[2]],scale:[Math.tan(fov*Math.PI/360),height/width]};
 }
 const vertex=`attribute vec2 position;
 varying vec2 screen;
 void main(){screen=position;gl_Position=vec4(position,0.0,1.0);}`;
 function fragment(precision){return `precision ${precision} float;
 varying vec2 screen;
 uniform sampler2D panorama;
 uniform vec3 right,up,forward,vertical;
 uniform vec2 scale,texel;
 uniform float strength;
 const float PI=3.141592653589793;
 void main(){
  vec3 camera=vec3(screen.x*scale.x,screen.y*scale.x*scale.y,1.0);
  vec3 gal=normalize(forward+right*camera.x+up*camera.y);
  vec2 uv=vec2(fract(0.5-atan(gal.y,gal.x)/(2.0*PI)),0.5-asin(clamp(gal.z,-1.0,1.0))/PI);
  vec3 color=texture2D(panorama,uv).rgb;
  // NPOT WebGL1 textures use clamping; blend their matching wrap edges.
  if(uv.x<texel.x){color=mix(texture2D(panorama,vec2(1.0-texel.x*0.5,uv.y)).rgb,color,0.5+0.5*uv.x/texel.x);}
  if(uv.x>1.0-texel.x){color=mix(texture2D(panorama,vec2(texel.x*0.5,uv.y)).rgb,color,0.5+0.5*(1.0-uv.x)/texel.x);}
  float horizon=dot(normalize(camera),vertical);
  float band=1.0-smoothstep(0.24,0.58,abs(gal.z));
  float alpha=strength*band*smoothstep(0.0,0.035,horizon);
  gl_FragColor=vec4(max(color-vec3(0.012),vec3(0.0)),alpha);
 }`;}
 function create(notify=()=>{}){
  let image=null,status='idle',gpu=null,gpuFailed=false,disposed=false;
  function load(){
   if(status!=='idle'||disposed)return;
   status='loading';image=new root.Image();
   image.onload=()=>{status=image.naturalWidth>0?'ready':'failed';notify();};
   image.onerror=()=>{status='failed';notify();};
   image.src='textures/milky-way.jpg';
  }
  function destroyGPU(){
   if(!gpu)return;
   const g=gpu;gpu=null;
   g.layer.removeEventListener('webglcontextlost',g.lost);
   g.layer.removeEventListener('webglcontextrestored',g.restored);
   if(g.valid&&!g.gl.isContextLost()){
    g.gl.deleteTexture(g.texture);g.gl.deleteBuffer(g.buffer);g.gl.deleteProgram(g.program);
   }
   g.layer.width=g.layer.height=1;
   const lose=g.gl.getExtension('WEBGL_lose_context');if(lose)lose.loseContext();
  }
  function initialize(){
   let layer=null,gl=null,program=null,buffer=null,texture=null;
   try{
    layer=root.document.createElement('canvas');
    gl=layer.getContext('webgl',{alpha:true,premultipliedAlpha:false,preserveDrawingBuffer:true,antialias:false,depth:false,stencil:false,powerPreference:'low-power'});
    if(!gl)throw Error('WebGL unavailable');
    const high=gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER,gl.HIGH_FLOAT),precision=high&&high.precision>0?'highp':'mediump';
    function shader(type,source){
     const shader=gl.createShader(type);if(!shader)throw Error('Shader unavailable');
     gl.shaderSource(shader,source);gl.compileShader(shader);
     if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)){gl.deleteShader(shader);throw Error('Shader compilation failed');}
     return shader;
    }
    const vs=shader(gl.VERTEX_SHADER,vertex);let fs;
    try{fs=shader(gl.FRAGMENT_SHADER,fragment(precision));}catch(e){gl.deleteShader(vs);throw e;}
    program=gl.createProgram();gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);
    gl.deleteShader(vs);gl.deleteShader(fs);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('Shader link failed');
    gl.useProgram(program);buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
    const position=gl.getAttribLocation(program,'position');gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
    const max=gl.getParameter(gl.MAX_TEXTURE_SIZE);let source=image;
    if(Math.max(image.naturalWidth,image.naturalHeight)>max){
     const staging=root.document.createElement('canvas'),ratio=max/Math.max(image.naturalWidth,image.naturalHeight);
     staging.width=Math.max(1,Math.floor(image.naturalWidth*ratio));staging.height=Math.max(1,Math.floor(image.naturalHeight*ratio));
     const c=staging.getContext('2d');c.imageSmoothingQuality='high';c.drawImage(image,0,0,staging.width,staging.height);source=staging;
    }
    texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,source);
    if(gl.getError()!==gl.NO_ERROR)throw Error('Texture upload failed');
    const uniforms={};for(const name of ['panorama','right','up','forward','vertical','scale','texel','strength'])uniforms[name]=gl.getUniformLocation(program,name);
    gl.uniform1i(uniforms.panorama,0);gl.uniform2f(uniforms.texel,1/(source.naturalWidth||source.width),1/(source.naturalHeight||source.height));
    const g={layer,gl,program,buffer,texture,uniforms,key:null,valid:true,lost(){},restored(){}};
    g.lost=e=>{e.preventDefault();g.valid=false;g.key=null;notify();};
    g.restored=()=>{destroyGPU();notify();};
    layer.addEventListener('webglcontextlost',g.lost);layer.addEventListener('webglcontextrestored',g.restored);
    return g;
   }catch(e){
    if(gl){if(texture)gl.deleteTexture(texture);if(buffer)gl.deleteBuffer(buffer);if(program)gl.deleteProgram(program);const lose=gl.getExtension('WEBGL_lose_context');if(lose)lose.loseContext();}
    gpuFailed=true;return null;
   }
  }
  function draw(ctx,basis,axes,width,height,fov,density=1,roll=0,strength=.82){
   const view=frame(basis,axes,width,height,fov,roll);if(!view||disposed||gpuFailed||strength<=0)return false;
   load();if(status!=='ready')return false;
   if(!gpu)gpu=initialize();if(!gpu||gpu.gl.isContextLost())return false;
   const d=Math.min(Math.max(1,Number.isFinite(density)?density:1),2,Math.sqrt(1500000/(width*height)));
   const w=Math.max(1,Math.floor(width*d)),h=Math.max(1,Math.floor(height*d)),g=gpu;
   const key=[w,h,...view.right,...view.up,...view.forward,...view.vertical,...view.scale,clamp(strength)].join(',');
   if(g.key!==key){
    if(g.layer.width!==w||g.layer.height!==h){g.layer.width=w;g.layer.height=h;}
    const gl=g.gl,u=g.uniforms;gl.viewport(0,0,w,h);gl.useProgram(g.program);
    for(const name of ['right','up','forward','vertical'])gl.uniform3fv(u[name],view[name]);
    gl.uniform2fv(u.scale,view.scale);gl.uniform1f(u.strength,clamp(strength));
    gl.drawArrays(gl.TRIANGLE_STRIP,0,4);g.key=key;
   }
   ctx.drawImage(g.layer,0,0,width,height);return true;
  }
  function release(){
   destroyGPU();
   if(image){image.onload=image.onerror=null;image.src='';image=null;}
   if(status!=='failed')status='idle';
  }
  return {draw,release,dispose(){release();disposed=true;}};
 }
 const api={uv,frame,create};root.SkyGalaxy=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
