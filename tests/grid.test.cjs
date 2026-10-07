const assert=require('node:assert/strict');
const G=require('../app/src/main/assets/grid.js'),M=require('../app/src/main/assets/core.js'),L=require('../app/src/main/assets/labels.js'),A=require('../app/src/main/assets/astronomy.js');
assert.deepEqual(G.clip([-100,100],[500,100],390,844),[8,100,382,100]);
assert.equal(G.clip([-10,0],[400,0],390,844),null);
assert.equal(G.clip(null,[100,100],390,844),null);
assert.equal(G.clip([NaN,100],[100,100],390,844),null);
assert.equal(G.hours(0),'0h');assert.equal(G.hours(23.5),'23h30m');
const epoch=new Date('2000-01-01T12:00:00Z'),identity=[[1,0,0],[0,1,0],[0,0,1]],reference=G.create().get(85,M.basis(120,35),identity),ecliptic=reference.find(line=>line.id==='ecliptic');
assert.equal(ecliptic.points.length,181);assert.equal(ecliptic.reference,'ecliptic');assert.equal(reference.find(line=>line.id==='dec0').reference,'equator');assert.equal(reference.find(line=>line.id==='ra0').reference,'meridian');assert.equal(reference.find(line=>line.id==='ra12').reference,'meridian');
for(let i=0;i<ecliptic.points.length;i++){const a=i*2*Math.PI/180,v=A.RotateVector(A.Rotation_ECL_EQJ(),new A.Vector(Math.cos(a),Math.sin(a),0,epoch)),p=ecliptic.points[i];assert(Math.hypot(p.eq[0]-v.x,p.eq[1]-v.y,p.eq[2]-v.z)<1e-12);}
let maxSolarLatitude=0;
for(const year of [2000,2026,2050])for(let month=0;month<12;month++){
 const date=new Date(Date.UTC(year,month,15)),sun=A.GeoVector('Sun',date,true),ecl=A.RotateVector(A.Rotation_EQJ_ECL(),sun),latitude=Math.abs(Math.asin(ecl.z/Math.hypot(ecl.x,ecl.y,ecl.z))*180/Math.PI);
 maxSolarLatitude=Math.max(maxSolarLatitude,latitude);assert(latitude<.03,'the geocentric Sun stays near the fixed J2000 ecliptic across dates');
}
let compared=0;
for(const [latitude,longitude] of [[39.9,116.4],[-33.9,151.2],[89,0]]){
 for(const time of ['2026-10-06T12:00:00Z','2040-04-17T00:00:00Z']){
  const date=new Date(time),rotation=A.Rotation_EQJ_HOR(date,new A.Observer(latitude,longitude,0)),grid=G.create();
  const basis=M.basis(135,40),wide=grid.get(85,basis,rotation.rot);
  assert.equal(grid.get(85,basis,rotation.rot),wide,'same geometry and rotation reused');
  const fine=grid.get(20,basis,rotation.rot);assert(fine.length>wide.length);
  assert(fine.reduce((n,line)=>n+line.points.length,0)<9000,'geometry remains bounded');
  const pole=[-rotation.rot[2][1],rotation.rot[2][0],rotation.rot[2][2]],polar=grid.get(20,{f:pole},rotation.rot);
  assert.equal(polar.filter(line=>line.id.startsWith('ra')).length,4,'polar meridians do not crowd');
  for(const line of fine)for(let i=0;i<line.points.length;i+=11){
   const p=line.points[i],v=A.RotateVector(rotation,new A.Vector(...p.eq,date));
   assert(Math.hypot(p.v[0]+v.y,p.v[1]-v.x,p.v[2]-v.z)<1e-12);compared++;
  }
  for(const [w,h,roll] of [[390,844,0],[844,390,.7],[390,844,-1.2]]){
   const visible=G.project(fine,M.projector(basis,w,h,20,roll),w,h);assert(visible.length>0);
   const candidates=[];
   for(const line of visible){for(const segment of line.segments)for(let i=0;i<4;i++)assert(segment[i]>=8-1e-7&&segment[i]<=(i%2?h:w)-8+1e-7);
    for(const anchor of line.alternatives)assert(Math.abs(anchor.angle)<=Math.PI/2+1e-9);
    if(line.alternatives.length)candidates.push({id:line.id,name:line.name,...line.alternatives[0],inline:true,alternatives:line.alternatives,radius:0,size:11,width:line.name.length*7,priority:5});
   }
   const hud={left:0,top:0,right:w,bottom:100},labels=L.layout(candidates,w,h,[hud]);assert(labels.length>0);
   for(const label of labels)assert(label.box.top>=100&&label.box.left>=6&&label.box.right<=w-6&&label.box.bottom<=h-6);
  }
 }
}
// A higher-priority object wins; an inline tick tries another place on its own curve.
const target={id:'target',name:'target',x:100,y:110,radius:0,size:12,width:50,priority:100};
const tick={id:'tick',name:'12h',x:100,y:130,radius:0,size:11,width:30,priority:5,inline:true,alternatives:[{x:100,y:130,angle:.7},{x:250,y:220,angle:-.8}]};
const result=L.layout([tick,target],390,844);assert.equal(result.length,2);assert.equal(result[0].id,'target');assert.equal(result[1].textX,250);
console.log(`PASS: ${compared} independent grid rotations, 181 ecliptic vectors, 36 solar dates (max J2000 latitude ${maxSolarLatitude.toFixed(5)} deg), reference planes, zoom/polar density, clipped paths, upright ticks, HUD and target exclusion, bounded cached geometry.`);
