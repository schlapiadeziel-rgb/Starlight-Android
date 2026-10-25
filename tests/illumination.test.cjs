const assert=require('node:assert/strict'),A=require('../app/src/main/assets/astronomy.js'),P=require('../app/src/main/assets/illumination.js'),M=require('../app/src/main/assets/core.js'),S=require('../app/src/main/assets/moon-surface.js');
const near=(a,b,t=1e-9)=>assert(Math.abs(a-b)<t,a+' != '+b);
for(const invalid of [NaN,Infinity,-1,181,null,{},'90'])assert.equal(P.state(invalid),null);
for(const [angle,fraction] of [[0,1],[60,.75],[90,.5],[120,.25],[180,0]]){const s=P.state(angle);near(s.fraction,fraction);near(Math.hypot(...s.light),1);near(s.phase,180-angle);}
let cases=0;
// Reconstruct phase from independent Earth-target and Sun-target vectors;
// this avoids treating a UI parameter round-trip as astronomy validation.
for(const year of [2026,2031,2050])for(let month=0;month<12;month++)for(const id of ['Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune']){
 const info=A.Illumination(id,new Date(Date.UTC(year,month,13,12))),a=info.gc,b=info.hc;
 const cosine=(a.x*b.x+a.y*b.y+a.z*b.z)/(Math.hypot(a.x,a.y,a.z)*Math.hypot(b.x,b.y,b.z)),angle=Math.acos(Math.max(-1,Math.min(1,cosine)))*180/Math.PI;
 near(info.phase_angle,angle,1e-7);near(P.state(info).fraction,(1+cosine)/2);cases++;
}
for(const angle of [0,10,60,90,130,175,180]){
 const state=P.state(angle);let lit=0,total=0;
 for(let y=0;y<240;y++)for(let x=0;x<240;x++){
  const a=(x+.5)*2/240-1,b=(y+.5)*2/240-1,r=a*a+b*b;if(r>=1)continue;
  const z=Math.sqrt(1-r);if(a*state.light[0]+z*state.light[2]>1e-12)lit++;total++;
  for(const yaw of [0,75]){
   const sample=S.sample(a,b,state.phase,{light:state.light,yaw,pitch:30});
   near(sample.light,Math.max(0,a*state.light[0]+z*state.light[2]));
  }
 }
 assert(Math.abs(lit/total-state.fraction)<.004,'projected lit area matches phase fraction');
}
const pixels={width:128,height:128,data:new Uint8ClampedArray(128*128*4)};
for(let y=0;y<128;y++)for(let x=0;x<128;x++){const i=(y*128+x)*4,r=((x+.5)*2/128-1)**2+((y+.5)*2/128-1)**2;if(r<1)pixels.data.set([230,210,190,255],i);}
assert.deepEqual(P.shade(pixels,0),pixels.data);const dark=P.shade(pixels,180),quarter=P.shade(pixels,90),center=(64*128+64)*4;
assert(dark[center]<12);assert(quarter[(64*128+96)*4]>quarter[(64*128+32)*4]*10);assert.equal(dark[center+3],255);
assert.equal(P.shade(null,90),null);assert.equal(P.shade(pixels,NaN),null);assert.equal(P.shade({width:2,height:3,data:[]},90),null);
for(const roll of [0,.6,-1])near(P.sunward([0,1,0],[1,0,0],M.projector(M.basis(0,0),390,844,85,roll)),-roll);
near(P.sunward([0,1,0],[0,0,1],M.projector(M.basis(0,0),390,844,85)),-Math.PI/2);
near(P.radius(4,85),4);near(P.radius(4,12),10.8);assert.equal(P.resolution(1000),256);
console.log(`PASS: ${cases} independent planetary phase-vector checks, projected lit-area ratios, texture rotation independent of lighting, cached pixel shading and screen Sun direction.`);
