/* Educational spherical texture viewer. No libration or relief shadows. */
(function(root){
 const sources=new WeakMap();
 function sampler(phase,view={}){
  const zoom=Number.isFinite(view.zoom)?Math.max(1,Math.min(4,view.zoom)):1;
  const a=phase*Math.PI/180,sunX=Math.sin(a),sunZ=-Math.cos(a);
  const yaw=(Number.isFinite(view.yaw)?view.yaw:0)*Math.PI/180,pitch=(Number.isFinite(view.pitch)?Math.max(-85,Math.min(85,view.pitch)):0)*Math.PI/180;
  const cy=Math.cos(yaw),sy=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch);
  return (x,y)=>{
   x/=zoom;y/=zoom;const rr=x*x+y*y;if(rr>=1)return null;
   const z=Math.sqrt(1-rr),up=-y,by=up*cp+z*sp,z1=z*cp-up*sp,bx=x*cy+z1*sy,bz=z1*cy-x*sy;
   return {u:((.5+Math.atan2(bx,bz)/(2*Math.PI))%1+1)%1,v:.5-Math.asin(Math.max(-1,Math.min(1,by)))/Math.PI,
    front:z,light:view.inspect?z:Math.max(0,bx*sunX+bz*sunZ),edge:Math.min(1,(1-Math.sqrt(rr))*256)};
  };
 }
 function sample(x,y,phase,view={}){return sampler(phase,view)(x,y);}
 function draw(target,image,phase,view={}){
  let source=sources.get(image);
  if(!source){
   const canvas=document.createElement('canvas');canvas.width=image.naturalWidth||image.width;canvas.height=image.naturalHeight||image.height;
   const sc=canvas.getContext('2d');sc.drawImage(image,0,0);
   source={width:canvas.width,height:canvas.height,pixels:sc.getImageData(0,0,canvas.width,canvas.height).data};
   sources.set(image,source);
  }
  const pixels=source.pixels;
  const ctx=target.getContext('2d'),size=target.width,out=ctx.createImageData(size,size),project=sampler(phase,view);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
   const fit=view.emissive?1.25:1,p=project(((x+.5)*2/size-1)*fit,((y+.5)*2/size-1)*fit);if(!p)continue;
   const tx=p.u*source.width-.5,ty=Math.max(0,Math.min(source.height-1,p.v*source.height-.5));
   const ix=Math.floor(tx),iy=Math.floor(ty),fx=tx-ix,fy=ty-iy,x0=(ix+source.width)%source.width,x1=(x0+1)%source.width,y1=Math.min(source.height-1,iy+1);
   const j00=(iy*source.width+x0)*4,j10=(iy*source.width+x1)*4,j01=(y1*source.width+x0)*4,j11=(y1*source.width+x1)*4,i=(y*size+x)*4;
   const shade=view.emissive?.8+.2*p.front:p.light>0?.16+.84*Math.pow(p.light,.45):.025;
   for(let c=0;c<3;c++)out.data[i+c]=((pixels[j00+c]*(1-fx)+pixels[j10+c]*fx)*(1-fy)+(pixels[j01+c]*(1-fx)+pixels[j11+c]*fx)*fy)*shade;
   out.data[i+3]=255*p.edge;
  }
  ctx.putImageData(out,0,0);
  if(view.emissive&&view.glow!==false){
   const zoom=Number.isFinite(view.zoom)?Math.max(1,Math.min(4,view.zoom)):1,r=size*.4*zoom,m=size/2;
   const g=ctx.createRadialGradient(m,m,r*.94,m,m,r*1.25);g.addColorStop(0,'#ffb434b0');g.addColorStop(.42,'#f78b2640');g.addColorStop(1,'#ef640000');
   ctx.save();ctx.globalCompositeOperation='destination-over';ctx.fillStyle=g;ctx.fillRect(0,0,size,size);ctx.restore();
  }
 }
 // The right-hand bright limb of a waxing sprite and left-hand limb of a
 // waning sprite must both point toward the projected Sun.
 function rotation(sunwardAngle,phase){return sunwardAngle-(phase>180?Math.PI:0);}
 const api={sample,draw,rotation};root.SkyMoonSurface=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
