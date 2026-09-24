const assert=require('node:assert/strict'),M=require('../app/src/main/assets/core.js'),P=require('../app/src/main/assets/pose.js');
const angle=(a,b)=>Math.acos(Math.max(-1,Math.min(1,a.reduce((n,x,i)=>n+x*b[i],0))))*180/Math.PI;
function valid(b){for(const k of ['r','u','f'])assert(Math.abs(Math.hypot(...b[k])-1)<1e-10);for(const [a,c] of [['r','u'],['r','f'],['u','f']])assert(Math.abs(b[a].reduce((n,x,i)=>n+x*b[c][i],0))<1e-10);}
const p=P.create();let sum=0;
p.update(M.basis(0,30),0);
for(let i=1;i<=120;i++){const b=p.update(M.basis(i%2?.5:-.5,30),i*33);valid(b);if(i>20)sum+=angle(b.f,M.vec(0,30))**2;}
assert(Math.sqrt(sum/100)<.2,'stationary jitter not reduced');
p.reset();p.update(M.basis(359,0),0);const north=p.update(M.basis(1,0),33);assert(angle(north.f,M.vec(0,0))<1,'north wrap');
for(let i=0;i<180;i++){valid(p.update(M.basis(i*2,80+i/10),100+i*33));}
p.reset();p.update(M.basis(0,0),0);let worst=0;
for(let i=1;i<=60;i++){const input=M.basis(i*2,20),b=p.update(input,i*33);worst=Math.max(worst,angle(input.f,b.f));}assert(worst<3,'moving response lags');
let b=p.update(M.basis(240,0),2100);assert(angle(b.f,M.vec(240,0))<1e-5,'large rotation must snap');
b=p.update(M.basis(242,0),3000);assert(angle(b.f,M.vec(242,0))<1e-5,'resume must reset');
p.reset();b=p.update(M.basis(120,-40),3033);assert(angle(b.f,M.vec(120,-40))<1e-5);
assert.equal(p.update({r:[NaN,0,0],u:[0,1,0],f:[0,0,1]},3066),null);
console.log('PASS: pose jitter, north wrap, zenith, orthonormal axes, moving response, rotation and resume reset.');
