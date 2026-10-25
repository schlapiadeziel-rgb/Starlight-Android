const assert=require('node:assert/strict'),M=require('../app/src/main/assets/core.js'),V=require('../app/src/main/assets/visual.js');
global.SkyVisual=V;
const H=require('../app/src/main/assets/horizon.js'),{createCanvas}=require('@napi-rs/canvas');
const area=p=>Math.abs(p.reduce((n,a,i)=>{const b=p[(i+1)%p.length];return n+a[0]*b[1]-a[1]*b[0];},0))/2;
let rays=0;
for(const [w,h] of [[390,844],[844,390]])for(const alt of [-90,-85,-45,0,20,85,90])for(const az of [0,110,270])for(const fov of [12,65,110])for(const roll of [0,.7,Math.PI/2,Math.PI]){
 const basis=M.basis(az,alt),p=H.plane(basis,w,h,fov,roll);
 assert(p);assert(Math.abs(area(H.polygon(p))+area(H.polygon(p,true))-w*h)<1e-6);
 for(let i=0;i<11;i++){
  const x=w*i/10,y=h*((i*7)%11)/10,ray=M.unproject(x,y,basis,w,h,fov,roll);
  assert(Math.abs(H.altitude(p,x,y)-Math.asin(Math.max(-1,Math.min(1,ray[2])))*180/Math.PI)<1e-7);
  if(Math.abs(ray[2])>1e-9)assert.equal(Math.sign(H.value(p,x,y)),Math.sign(ray[2]));rays++;
 }
 for(const corner of H.polygon(p))assert(H.value(p,...corner)<1e-8);
}
assert.equal(H.plane(M.basis(0,0),0,390,85),null);assert.equal(H.plane(M.basis(0,0),390,844,180),null);
assert.deepEqual(H.polygon(null),[]);
// Real raster: stars, photographic pixels and glow below a tilted horizon
// are fully covered, while the unoccluded celestial pixels are unchanged.
for(const roll of [0,.6,Math.PI/2,Math.PI]){
 const canvas=createCanvas(320,240),ctx=canvas.getContext('2d'),p=H.plane(M.basis(135,0),320,240,85,roll);
 ctx.fillStyle='#ff00ff';ctx.fillRect(0,0,320,240);ctx.globalAlpha=1;
 H.ground(ctx,p,-20);assert.equal(ctx.globalAlpha,1);
 const image=ctx.getImageData(0,0,320,240).data;
 for(let y=5;y<240;y+=17)for(let x=5;x<320;x+=17){
  const n=(y*320+x)*4,below=H.value(p,x+.5,y+.5)<0;
  if(Math.abs(H.value(p,x+.5,y+.5))/Math.hypot(p.nx,p.ny)<1.2)continue;
  if(below)assert(image[n]<20&&image[n+1]<25&&image[n+2]<30,'opaque ground blocks foreground');
  else assert.deepEqual([...image.slice(n,n+4)],[255,0,255,255]);
 }
 H.background(ctx,p,10);const noon=ctx.getImageData(160,30,1,1).data;
 H.background(ctx,p,-20);const night=ctx.getImageData(160,30,1,1).data;
 assert(noon[0]+noon[1]+noon[2]>night[0]+night[1]+night[2]);
}
console.log(`PASS: ${rays} independent horizon-ray comparisons, complete sky/ground and rolled clipping, and actual opaque raster occlusion.`);
