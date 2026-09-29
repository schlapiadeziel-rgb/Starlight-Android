const assert=require('node:assert/strict'),M=require('../app/src/main/assets/core.js'),D=Math.PI/180;
const near=(a,b,label)=>assert(Math.abs(a-b)<1e-6,label+': '+a+' != '+b);
const focal=(w,fov)=>w/(2*Math.tan(fov*D/2));
let seed=20260930;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
// Round-trip actual chart projections across sizes, poles and phone roll.
for(let i=0;i<1000;i++){
 const w=i%2?390:844,h=i%2?844:390,b=M.basis(random()*360,random()*170-85),fov=[12,45,85,110][i%4],roll=random()*Math.PI*2,x=random()*w,y=random()*h;
 const v=M.unproject(x,y,b,w,h,fov,roll),q=M.project(v,b,w,h,fov,roll);
 near(Math.hypot(...v),1,'unit ray');near(q[0],x,'inverse x');near(q[1],y,'inverse y');
 const same=M.anchoredView(M.unproject(x,y,b,w,h,fov),x,y,w,h,fov,Math.atan2(b.f[0],b.f[1])/D,Math.asin(b.f[2])/D);
 const p=M.project(M.unproject(x,y,b,w,h,fov),M.basis(same.az,same.alt),w,h,fov);
 near(p[0],x,'stationary anchor x');near(p[1],y,'stationary anchor y');
 near(M.delta(same.az,Math.atan2(b.f[0],b.f[1])/D),0,'no azimuth flip');near(same.alt,Math.asin(b.f[2])/D,'no altitude flip');
}
for(const fov of [35,55,85])for(const scale of [.8,1,1.25,2]){
 const next=M.zoomFov(fov,scale);near(focal(390,next)/focal(390,fov),scale,'perspective zoom ratio');
}
assert.equal(M.zoomFov(12,100),12);assert.equal(M.zoomFov(110,.001),110);assert.equal(M.zoomFov(55,0),55);assert.equal(M.zoomFov(55,Infinity),55);
assert.equal(M.unproject(1,2,M.basis(0,0),0,800,55),null);
assert.equal(M.unproject(1,2,M.basis(0,0),390,800,180),null);
// Known feasible destinations: dragging or pinching should put the same
// celestial ray at the new gesture center, including crossing due north.
for(let i=0;i<500;i++){
 const w=i%2?390:844,h=i%2?844:390,az=[359,1,90,180,270][i%5],alt=random()*120-60,fov=55,nextFov=M.zoomFov(fov,.8+random()*.6),x=w*(.2+random()*.6),y=h*(.3+random()*.4);
 const desiredAz=(az+random()*12-6+360)%360,desiredAlt=alt+random()*8-4,v=M.unproject(x,y,M.basis(desiredAz,desiredAlt),w,h,nextFov);
 const next=M.anchoredView(v,x,y,w,h,nextFov,az,alt),q=M.project(v,M.basis(next.az,next.alt),w,h,nextFov);
 near(q[0],x,'moved anchor x');near(q[1],y,'moved anchor y');
 assert(next.az>=0&&next.az<360&&Math.abs(next.alt)<=85);
}
// Incremental pinch at an off-center position must not accumulate drift.
let az=358,alt=15,fov=85;const w=390,h=844,x=270,y=350,v=M.unproject(x,y,M.basis(az,alt),w,h,fov);
for(let i=0;i<25;i++){
 fov=M.zoomFov(fov,1.02);const next=M.anchoredView(v,x,y,w,h,fov,az,alt);az=next.az;alt=next.alt;
 const q=M.project(v,M.basis(az,alt),w,h,fov);near(q[0],x,'pinch drift x');near(q[1],y,'pinch drift y');
}
// A roll-free map cannot keep every off-center ray fixed at the poles.
// Clamp there without NaNs or leaving the supported pitch range.
for(const altitude of [-90,-89,89,90]){
 const next=M.anchoredView(M.vec(359,altitude),340,380,390,844,55,359,altitude);
 assert(Number.isFinite(next.az)&&Number.isFinite(next.alt));assert(Math.abs(next.alt)<=85);
}
console.log('PASS: inverse projections, perspective zoom, anchored movement across north, repeated pinch without drift, and pole limits.');
