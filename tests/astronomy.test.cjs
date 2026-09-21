const assert=require('node:assert/strict');
const M=require('../app/src/main/assets/core.js');
const A=require('../app/src/main/assets/astronomy.js');
for(const [az,alt] of [[0,0],[90,45],[270,-40],[359,85]]){
 const b=M.basis(az,alt),p=M.project(M.vec(az,alt),b,400,800,90);
 assert(Math.abs(p[0]-200)<1e-9);assert(Math.abs(p[1]-400)<1e-9);
 assert.equal(M.project(M.vec((az+180)%360,-alt),b,400,800,90),null);
}
assert.equal(M.delta(1,359),2);assert.equal(M.delta(359,1),-2);
assert(M.project(M.vec(10,0),M.basis(0,0),400,800,90)[0]>200);
assert(M.project(M.vec(0,10),M.basis(0,0),400,800,90)[1]<400);
// Independent Horizon vs J2000 rotation path, multiple sites, dates and poles.
for(const date of ['2026-09-20T12:00:00Z','2000-01-01T12:00:00Z','2040-06-21T00:00:00Z']){
 const t=new Date(date);
 for(const [lat,lon] of [[0,0],[39.9,116.4],[-33.9,151.2],[89,179]]){
  const obs=new A.Observer(lat,lon,0);
  for(const body of ['Sun','Moon','Mars','Jupiter']){
   const eq0=A.Equator(body,t,obs,false,true),eq=A.Equator(body,t,obs,true,true);
   const v=A.RotateVector(A.Rotation_EQJ_HOR(t,obs),eq0.vec);
   const hor=A.HorizonFromVector(v,''),direct=A.Horizon(t,obs,eq.ra,eq.dec,'');
   assert(Math.abs(M.delta(hor.lon,direct.azimuth))<1e-6);
   assert(Math.abs(hor.lat-direct.altitude)<1e-6);
  }
 }
}
// Sun near zenith at equinox, Greenwich local noon; broad physical sanity check.
const t=new Date('2026-03-20T12:00:00Z'),obs=new A.Observer(0,0,0),eq=A.Equator('Sun',t,obs,true,true);
assert(A.Horizon(t,obs,eq.ra,eq.dec,'normal').altitude>87);
console.log('PASS: projections, azimuth wrap, 48 horizon cross-checks, equinox sanity.');
