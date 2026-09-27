/* Procedural cloud texture: decorative Milky Way haze, never a star catalog. */
(function(root){
 const cache=new Map();
 function sprite(variant=0,warm=false){
  const key=(variant%4+4)%4+(warm?4:0);
  if(cache.has(key))return cache.get(key);
  const layer=document.createElement('canvas');layer.width=layer.height=192;
  const ctx=layer.getContext('2d');
  let seed=(0x9e3779b9^Math.imul(key+1,0x85ebca6b))>>>0;
  const rand=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return (seed>>>0)/4294967296;};
  const colors=warm?[[214,163,146],[232,185,145],[160,171,213]]:[[113,163,211],[151,192,220],[207,195,192]];
  // Several translucent scales give the clouds structure without faking star positions.
  for(let i=0;i<88;i++){
   const x=18+rand()*156,y=24+rand()*144,r=8+rand()*(i<38?46:17);
   const [red,green,blue]=colors[Math.floor(rand()*colors.length)];
   const alpha=(i<38?.21:.12)*(.55+rand()*.8);
   const glow=ctx.createRadialGradient(x,y,0,x,y,r);
   glow.addColorStop(0,`rgba(${red},${green},${blue},${alpha})`);
   glow.addColorStop(.44,`rgba(${red},${green},${blue},${alpha*.46})`);
   glow.addColorStop(1,'rgba(0,0,0,0)');
   ctx.fillStyle=glow;ctx.fillRect(x-r,y-r,r*2,r*2);
  }
  ctx.save();ctx.globalCompositeOperation='destination-out';
  for(let i=0;i<4;i++){
   ctx.save();ctx.translate(96+(rand()-.5)*95,96+(rand()-.5)*80);ctx.rotate((rand()-.5)*1.4);
   const shadow=ctx.createRadialGradient(0,0,0,0,0,35+rand()*18);
   shadow.addColorStop(0,'rgba(0,0,0,.58)');shadow.addColorStop(1,'rgba(0,0,0,0)');
   ctx.scale(2.4,.42+rand()*.4);ctx.fillStyle=shadow;ctx.fillRect(-58,-58,116,116);ctx.restore();
  }
  ctx.restore();
  ctx.save();ctx.globalCompositeOperation='destination-in';
  const edge=ctx.createRadialGradient(96,96,22,96,96,95);
  edge.addColorStop(0,'rgba(255,255,255,1)');edge.addColorStop(.6,'rgba(255,255,255,.9)');edge.addColorStop(1,'rgba(255,255,255,0)');
  ctx.fillStyle=edge;ctx.fillRect(0,0,192,192);ctx.restore();
  cache.set(key,layer);return layer;
 }
 const api={sprite};root.SkyMilky=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
