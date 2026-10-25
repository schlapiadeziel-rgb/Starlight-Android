/* The geometric horizon is exact for the chart's pinhole projection.
   Sky/ground colors are an illustration, not a local terrain or weather model. */
(function(root){
 'use strict';
 const D=Math.PI/180;
 const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
 function plane(basis,width,height,fov,roll=0){
  if(!basis||![width,height,fov,roll,...basis.f,...basis.r,...basis.u].every(Number.isFinite)||width<=0||height<=0||fov<=0||fov>=180)return null;
  const focal=width/(2*Math.tan(fov*D/2)),c=Math.cos(roll),s=Math.sin(roll);
  return {width,height,focal,nx:(basis.r[2]*c-basis.u[2]*s)/focal,
   ny:-(basis.u[2]*c+basis.r[2]*s)/focal,z:basis.f[2]};
 }
 function value(p,x,y){return p.nx*(x-p.width/2)+p.ny*(y-p.height/2)+p.z;}
 function altitude(p,x,y){
  const rayLength=Math.hypot((x-p.width/2)/p.focal,(y-p.height/2)/p.focal,1);
  return Math.asin(clamp(value(p,x,y)/rayLength,-1,1))/D;
 }
 // Clip the viewport against the actual horizon plane, including vertical
 // horizons, completely sky/ground views and inverted phone orientations.
 function polygon(p,sky=false){
  if(!p)return [];
  const corners=[[0,0],[p.width,0],[p.width,p.height],[0,p.height]],out=[],sign=sky?1:-1;
  for(let i=0;i<corners.length;i++){
   const a=corners[i],b=corners[(i+1)%corners.length],va=sign*value(p,...a),vb=sign*value(p,...b);
   if(va>=0)out.push(a);
   if((va>=0)!==(vb>=0)){const t=va/(va-vb);out.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]);}
  }
  return out;
 }
 function path(ctx,points){
  ctx.beginPath();for(let i=0;i<points.length;i++)i?ctx.lineTo(...points[i]):ctx.moveTo(...points[i]);ctx.closePath();
 }
 function blend(a,b,t){return a.map((v,i)=>Math.round(v+(b[i]-v)*clamp(t)));}
 function rgb(hex){return [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));}
 function color(alt,sunAlt,night=false){
  const colors=root.SkyVisual.palette(sunAlt,night).map(rgb),t=clamp(alt/70);
  return t<.38?blend(colors[2],colors[1],t/.38):blend(colors[1],colors[0],(t-.38)/.62);
 }
 function gradient(ctx,p,sunAlt,night,ground=false){
  const norm=Math.hypot(p.nx,p.ny),fill=a=>ground?
   blend(sunAlt>0?[39,48,41]:[11,20,23],sunAlt>0?[12,19,18]:[2,6,10],clamp(-a/35)):color(a,sunAlt,night);
  if(norm<1e-8)return 'rgb('+fill(altitude(p,p.width/2,p.height/2)).join(',')+')';
  const ux=p.nx/norm,uy=p.ny/norm,span=Math.max(p.width,p.height)*2;
  // Center on the viewport instead of a distant offscreen horizon to retain
  // precision when looking nearly straight up or down.
  const x=p.width/2,y=p.height/2,g=ctx.createLinearGradient(x-ux*span,y-uy*span,x+ux*span,y+uy*span);
  for(let i=0;i<=40;i++){const d=(i/40*2-1)*span;g.addColorStop(i/40,'rgb('+fill(altitude(p,x+ux*d,y+uy*d)).join(',')+')');}
  return g;
 }
 function background(ctx,p,sunAlt,night=false){
  if(!p)return false;ctx.save();ctx.fillStyle=gradient(ctx,p,sunAlt,night);ctx.fillRect(0,0,p.width,p.height);ctx.restore();return true;
 }
 function ground(ctx,p,sunAlt,night=false){
  const points=polygon(p);if(points.length<3)return false;
  ctx.save();path(ctx,points);ctx.fillStyle=gradient(ctx,p,sunAlt,night,true);ctx.fill();ctx.restore();return true;
 }
 const api={plane,value,altitude,polygon,background,ground};root.SkyHorizon=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
