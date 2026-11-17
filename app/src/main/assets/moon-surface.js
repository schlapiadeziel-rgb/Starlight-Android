/* Educational spherical texture viewer. No libration or relief shadows.
   Minified discs sample a longitude-wrapped mip chain so fine albedo does not shimmer.
   Magnified settled frames add a light unsharp difference from the next mip.
   Drag-sized frames stay on one bilinear mip. Phase geometry is unchanged. */
(function(root){
 const sources=new WeakMap();
 function sampler(phase,view={}){
  const zoom=Number.isFinite(view.zoom)?Math.max(1,Math.min(4,view.zoom)):1;
  const a=phase*Math.PI/180,sunX=Math.sin(a),sunZ=-Math.cos(a);
  const yaw=(Number.isFinite(view.yaw)?view.yaw:0)*Math.PI/180,pitch=(Number.isFinite(view.pitch)?Math.max(-85,Math.min(85,view.pitch)):0)*Math.PI/180;
  const cy=Math.cos(yaw),sy=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch);
  const input=view.light,norm=Array.isArray(input)&&input.length===3&&input.every(Number.isFinite)?Math.hypot(...input):0,light=norm>1e-8?input.map(v=>v/norm):null;
  return (x,y)=>{
   x/=zoom;y/=zoom;const rr=x*x+y*y;if(rr>=1)return null;
   const z=Math.sqrt(1-rr),up=-y,by=up*cp+z*sp,z1=z*cp-up*sp,bx=x*cy+z1*sy,bz=z1*cy-x*sy;
   return {u:((.5+Math.atan2(bx,bz)/(2*Math.PI))%1+1)%1,v:.5-Math.asin(Math.max(-1,Math.min(1,by)))/Math.PI,
    front:z,light:view.inspect?z:Math.max(0,light?x*light[0]+up*light[1]+z*light[2]:bx*sunX+bz*sunZ),
    edge:Math.min(1,(1-Math.sqrt(rr))*256),rim:1-Math.sqrt(rr)};
  };
 }
 function sample(x,y,phase,view={}){return sampler(phase,view)(x,y);}
 function mipChain(pixels,width,height){
  const levels=[{pixels,width,height}];
  if(!(pixels&&pixels.length>=width*height*4))return levels;
  let w=width,h=height,src=pixels;
  while(w>=4&&h>=4&&levels.length<8){
   const nw=w>>1,nh=h>>1,dst=new Uint8ClampedArray(nw*nh*4);
   for(let y=0;y<nh;y++){
    const y0=y*2,y1=y0+1;
    for(let x=0;x<nw;x++){
     const x0=x*2,x1=(x0+1)%w,o=(y*nw+x)*4,a=(y0*w+x0)*4,b=(y0*w+x1)*4,c=(y1*w+x0)*4,d=(y1*w+x1)*4;
     dst[o]=(src[a]+src[b]+src[c]+src[d])*.25;dst[o+1]=(src[a+1]+src[b+1]+src[c+1]+src[d+1])*.25;
     dst[o+2]=(src[a+2]+src[b+2]+src[c+2]+src[d+2])*.25;dst[o+3]=(src[a+3]+src[b+3]+src[c+3]+src[d+3])*.25;
    }
   }
   levels.push({pixels:dst,width:nw,height:nh});src=dst;w=nw;h=nh;
  }
  return levels;
 }
 const sampleRGB=[0,0,0],blurRGB=[0,0,0];
 function bilinear(level,u,v,out){
  const w=level.width,h=level.height,p=level.pixels,x=u*w-.5,y=v*h-.5,x0=Math.floor(x),y0=Math.floor(y),fx=x-x0,fy=y-y0;
  const xA=((x0%w)+w)%w,xB=(xA+1)%w,yA=y0<0?0:y0>=h?h-1:y0,yB=y0+1<0?0:y0+1>=h?h-1:y0+1;
  const i00=(yA*w+xA)<<2,i10=(yA*w+xB)<<2,i01=(yB*w+xA)<<2,i11=(yB*w+xB)<<2,ax=1-fx,ay=1-fy;
  out[0]=(p[i00]*ax+p[i10]*fx)*ay+(p[i01]*ax+p[i11]*fx)*fy;
  out[1]=(p[i00+1]*ax+p[i10+1]*fx)*ay+(p[i01+1]*ax+p[i11+1]*fx)*fy;
  out[2]=(p[i00+2]*ax+p[i10+2]*fx)*ay+(p[i01+2]*ax+p[i11+2]*fx)*fy;
 }
 function sampleAlbedo(levels,u,v,texels,precise){
  const max=levels.length-1;
  if(!(texels>0)){bilinear(levels[0],u,v,sampleRGB);return;}
  if(texels<1){
   bilinear(levels[0],u,v,sampleRGB);
   if(!precise||max<1)return;
   bilinear(levels[1],u,v,blurRGB);
   const k=Math.min(.55,(1-texels)*.62);
   sampleRGB[0]+= (sampleRGB[0]-blurRGB[0])*k;sampleRGB[1]+=(sampleRGB[1]-blurRGB[1])*k;sampleRGB[2]+=(sampleRGB[2]-blurRGB[2])*k;
   return;
  }
  const level=Math.log2(texels);
  if(!precise){bilinear(levels[Math.max(0,Math.min(max,Math.round(level)))],u,v,sampleRGB);return;}
  const i0=Math.max(0,Math.min(max,Math.floor(level))),i1=Math.min(max,i0+1),f=Math.min(1,Math.max(0,level-i0));
  if(i0===i1||f===0){bilinear(levels[i0],u,v,sampleRGB);return;}
  bilinear(levels[i0],u,v,sampleRGB);bilinear(levels[i1],u,v,blurRGB);
  const g=1-f;sampleRGB[0]=sampleRGB[0]*g+blurRGB[0]*f;sampleRGB[1]=sampleRGB[1]*g+blurRGB[1]*f;sampleRGB[2]=sampleRGB[2]*g+blurRGB[2]*f;
 }
 function tone(value,emissive){
  if(emissive)return value;
  const n=value/255,c=n+(n-.5)*.14;
  return c<=0?0:c>=1?255:c*255;
 }
 function shadeFor(light,front,emissive){
  if(emissive)return .8+.2*front;
  const lambert=light>0?light:0,lit=lambert>0?.07+.93*Math.pow(lambert,.7):.03;
  return lit*(.9+.1*Math.max(0,front));
 }
 function draw(target,image,phase,view={}){
  let source=sources.get(image);
  if(!source){
   const canvas=document.createElement('canvas');canvas.width=image.naturalWidth||image.width;canvas.height=image.naturalHeight||image.height;
   const sc=canvas.getContext('2d');sc.drawImage(image,0,0);
   const pixels=sc.getImageData(0,0,canvas.width,canvas.height).data;
   source={width:canvas.width,height:canvas.height,pixels,levels:mipChain(pixels,canvas.width,canvas.height)};
   sources.set(image,source);
  }
  const ctx=target.getContext('2d'),size=target.width,out=ctx.createImageData(size,size),project=sampler(phase,view);
  const zoom=Number.isFinite(view.zoom)?Math.max(1,Math.min(4,view.zoom)):1,precise=size>=384,emissive=!!view.emissive;
  const baseFoot=source.width/(Math.PI*Math.max(1,size)*zoom);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
   const fit=emissive?1.25:1,p=project(((x+.5)*2/size-1)*fit,((y+.5)*2/size-1)*fit);if(!p)continue;
   sampleAlbedo(source.levels,p.u,p.v,baseFoot/Math.max(.28,p.front),precise);
   const shade=shadeFor(p.light,p.front,emissive),i=(y*size+x)*4,cover=Math.min(1,p.rim*size*.85);
   out.data[i]=tone(sampleRGB[0],emissive)*shade;out.data[i+1]=tone(sampleRGB[1],emissive)*shade;out.data[i+2]=tone(sampleRGB[2],emissive)*shade;out.data[i+3]=cover>=1?255:Math.max(0,cover*255);
  }
  ctx.putImageData(out,0,0);
  if(view.emissive&&view.glow!==false){
   const r=size*.4*zoom,m=size/2;
   const g=ctx.createRadialGradient(m,m,r*.94,m,m,r*1.25);g.addColorStop(0,'#ffb434b0');g.addColorStop(.42,'#f78b2640');g.addColorStop(1,'#ef640000');
   ctx.save();ctx.globalCompositeOperation='destination-over';ctx.fillStyle=g;ctx.fillRect(0,0,size,size);ctx.restore();
  }
 }
 // The right-hand bright limb of a waxing sprite and left-hand limb of a
 // waning sprite must both point toward the projected Sun.
 function rotation(sunwardAngle,phase){return sunwardAngle-(phase>180?Math.PI:0);}
 const api={sample,draw,rotation,release(image){sources.delete(image);}};root.SkyMoonSurface=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
