/* Illustrative ringed Saturn. The ring pattern and apparent tilt are not an ephemeris. */
(function(root){
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 function ringColor(radius,front){
  if(radius<1.17||radius>2.27)return null;
  if(radius>1.90&&radius<2.015)return null; // Cassini division.
  let a=radius<1.46?.27:radius<1.90?.74:radius<2.19?.50:.20;
  const striation=.80+.12*Math.sin(radius*178)+.08*Math.sin(radius*444);
  a=clamp(a*striation*(front?1:.72),0,.9);
  const warmth=radius<1.46?0:radius<1.90?1:2;
  return `rgba(${213+warmth*7},${202+warmth*6},${177+warmth*4},${a.toFixed(3)})`;
 }
 function drawHalf(ctx,cx,cy,r,opening,front){
  ctx.save();ctx.translate(cx,cy);ctx.rotate(-.23);ctx.scale(1,opening);
  ctx.lineWidth=r*.013;
  for(let band=1.175;band<2.27;band+=.012){
   const color=ringColor(band,front);if(!color)continue;
   ctx.beginPath();ctx.arc(0,0,r*band,front?0:Math.PI,front?Math.PI:Math.PI*2);
   ctx.strokeStyle=color;ctx.stroke();
  }
  ctx.restore();
 }
 function draw(target,image,view={}){
  const size=target.width,ctx=target.getContext('2d'),zoom=clamp(Number.isFinite(view.zoom)?view.zoom:1,1,4);
  const r=size*.21*zoom,c=size/2,opening=clamp(.32+(Number.isFinite(view.pitch)?view.pitch:0)/230,.085,.72);
  ctx.clearRect(0,0,size,size);
  drawHalf(ctx,c,c,r,opening,false);
  const sphere=document.createElement('canvas');sphere.width=sphere.height=size;
  root.SkyMoonSurface.draw(sphere,image,180,{inspect:true,yaw:view.yaw||0,pitch:view.pitch||0});
  ctx.drawImage(sphere,c-r,c-r,2*r,2*r);
  drawHalf(ctx,c,c,r,opening,true);
 }
 const api={draw,ringColor};root.SkySaturn=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
