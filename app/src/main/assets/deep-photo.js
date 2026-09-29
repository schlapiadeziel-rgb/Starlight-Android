/* Soft-edged preview of a documented telescope image; catalog coordinates stay authoritative. */
(function(root){
 const cache=new WeakMap();
 function sprite(image,requested=320){
  if(!Number.isFinite(image.naturalWidth)||!Number.isFinite(image.naturalHeight)||image.naturalWidth<=0||image.naturalHeight<=0)return null;
  const source=Math.max(image.naturalWidth,image.naturalHeight),need=Number.isFinite(requested)&&requested>0?requested:320;
  const level=Math.min(source,[320,640,1024].find(n=>n>=need)||1024),previous=cache.get(image);
  if(previous&&previous.level>=level)return previous.canvas;
  // Keep one canvas per source; upgrade only when more physical pixels are needed.
  const scale=level/source;
  const w=Math.max(1,Math.round(image.naturalWidth*scale)),h=Math.max(1,Math.round(image.naturalHeight*scale));
  const canvas=previous?previous.canvas:document.createElement('canvas');canvas.width=w;canvas.height=h;
  const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(image,0,0,w,h);
  ctx.save();ctx.globalCompositeOperation='destination-in';ctx.translate(w/2,h/2);ctx.scale(w/2,h/2);
  const mask=ctx.createRadialGradient(0,0,.25,0,0,1);
  mask.addColorStop(0,'#ffffffff');mask.addColorStop(.65,'#ffffffe0');mask.addColorStop(1,'#ffffff00');
  ctx.fillStyle=mask;ctx.fillRect(-1,-1,2,2);ctx.restore();
  cache.set(image,{canvas,level});return canvas;
 }
 // These are intentionally enlarged viewing aids, with explicit size bounds.
 function size(id,fov,selected=false){
  const base=Math.max(52,Math.min(170,2800/Math.max(12,fov)));
  return id==='M42'?(selected?base*.75:base*.60):(selected?Math.max(base,94):base);
 }
 const api={sprite,size};root.SkyDeepPhoto=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
