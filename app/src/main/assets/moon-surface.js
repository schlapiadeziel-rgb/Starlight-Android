/* North-up, fixed near-side educational globe. No libration or relief shadows. */
(function(root){
 const sources=new WeakMap();
 function sample(x,y,phase){
  const rr=x*x+y*y;if(rr>=1)return null;
  const z=Math.sqrt(1-rr),a=phase*Math.PI/180;
  return {u:.5+Math.atan2(x,z)/(2*Math.PI),v:.5-Math.asin(-y)/Math.PI,
   light:Math.max(0,x*Math.sin(a)-z*Math.cos(a)),edge:Math.min(1,(1-Math.sqrt(rr))*256)};
 }
 function draw(target,image,phase){
  let source=sources.get(image);
  if(!source){
   const canvas=document.createElement('canvas');canvas.width=image.naturalWidth||image.width;canvas.height=image.naturalHeight||image.height;
   const sc=canvas.getContext('2d');sc.drawImage(image,0,0);
   source={width:canvas.width,height:canvas.height,pixels:sc.getImageData(0,0,canvas.width,canvas.height).data};
   sources.set(image,source);
  }
  const pixels=source.pixels;
  const ctx=target.getContext('2d'),size=target.width,out=ctx.createImageData(size,size);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
   const p=sample((x+.5)*2/size-1,(y+.5)*2/size-1,phase);if(!p)continue;
   const sx=Math.min(source.width-1,Math.floor(p.u*source.width)),sy=Math.min(source.height-1,Math.floor(p.v*source.height)),j=(sy*source.width+sx)*4,i=(y*size+x)*4;
   const shade=p.light>0?.16+.84*Math.pow(p.light,.45):.025;
   for(let c=0;c<3;c++)out.data[i+c]=pixels[j+c]*shade;
   out.data[i+3]=255*p.edge;
  }
  ctx.putImageData(out,0,0);
 }
 // The right-hand bright limb of a waxing sprite and left-hand limb of a
 // waning sprite must both point toward the projected Sun.
 function rotation(sunwardAngle,phase){return sunwardAngle-(phase>180?Math.PI:0);}
 const api={sample,draw,rotation};root.SkyMoonSurface=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
