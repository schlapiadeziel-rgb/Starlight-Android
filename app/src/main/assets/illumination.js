/* Apparent planetary illumination from the bundled astronomical model.
   Texture longitude, north orientation and displayed size remain illustrative. */
(function(root){
 'use strict';
 const D=Math.PI/180,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 function state(info){
  const angle=typeof info==='number'?info:info?.phase_angle;
  if(!Number.isFinite(angle)||angle<0||angle>180)return null;
  const a=angle*D;
  return {angle,fraction:(1+Math.cos(a))/2,phase:180-angle,light:[Math.sin(a),0,Math.cos(a)]};
 }
 function sunward(target,sun,project){
  if(!Array.isArray(target)||!Array.isArray(sun)||target.length!==3||sun.length!==3||!target.every(Number.isFinite)||!sun.every(Number.isFinite))return 0;
  const q=project(target);if(!q)return 0;
  const dot=sun.reduce((n,v,i)=>n+v*target[i],0),tangent=sun.map((v,i)=>v-dot*target[i]),norm=Math.hypot(...tangent);
  if(norm<1e-8)return 0;
  const p=project(target.map((v,i)=>v+.03*tangent[i]/norm));
  return p?Math.atan2(p[1]-q[1],p[0]-q[0]):0;
 }
 function radius(base,fov){return Number.isFinite(fov)&&fov>0?base*clamp(65/fov,1,2.7):base;}
 function resolution(pixels){return pixels>128?256:pixels>64?128:64;}
 // Re-shade a small cached inspection globe instead of keeping or decoding
 // the 2048-pixel source for every phase/date change.
 function shade(source,angle){
  const view=state(angle);if(!source||!view||!Number.isInteger(source.width)||source.width<1||source.width!==source.height||source.data?.length!==source.width*source.height*4)return null;
  const size=source.width,out=new Uint8ClampedArray(source.data);
  if(angle===0)return out;
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
   const i=(y*size+x)*4;if(!out[i+3])continue;
   const nx=(x+.5)*2/size-1,ny=1-(y+.5)*2/size,rr=nx*nx+ny*ny;if(rr>=1)continue;
   const z=Math.sqrt(1-rr),light=nx*view.light[0]+ny*view.light[1]+z*view.light[2];
   const inspection=.16+.84*Math.pow(z,.45),observing=light>0?.16+.84*Math.pow(light,.45):.025,ratio=Math.min(1,observing/inspection);
   for(let c=0;c<3;c++)out[i+c]=source.data[i+c]*ratio;
  }
  return out;
 }
 const api={state,sunward,radius,resolution,shade};root.SkyIllumination=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
