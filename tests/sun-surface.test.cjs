const assert=require('node:assert/strict'),{createCanvas}=require('@napi-rs/canvas');
const Sun=require('../app/src/main/assets/sun-surface.js'),Surface=require('../app/src/main/assets/moon-surface.js');
global.document={createElement:()=>createCanvas(1,1)};
const a=Sun.geometry({yaw:15,pitch:-30},0),b=Sun.geometry({yaw:15,pitch:-30},8);
assert.deepEqual(a,Sun.geometry({yaw:15,pitch:-30},0),'artwork is repeatable');
assert.notDeepEqual(a,b,'limb geometry evolves over time');
assert.notDeepEqual(a,Sun.geometry({yaw:60,pitch:20},0),'artwork rotates with the body');
assert.equal(a.paths.length,180);assert(a.paths.every(p=>p.points.length===21));
for(const view of [{},{yaw:360,pitch:85,zoom:4},{yaw:-90,pitch:-85,zoom:-20}])for(const time of [0,100,NaN]){
 const g=Sun.geometry(view,time);assert(g.zoom>=1&&g.zoom<=4);
 for(const path of g.paths)for(const q of path.points)assert(q.every(Number.isFinite)&&Math.hypot(...q)<1.25);
}
const texture=createCanvas(64,32),tc=texture.getContext('2d');tc.fillStyle='#b55b17';tc.fillRect(0,0,64,32);
let projections=0;const renderer=Sun.create(texture,{draw(...args){projections++;Surface.draw(...args);}}),target=createCanvas(256,256),ctx=target.getContext('2d');
const pixels=()=>Buffer.from(ctx.getImageData(0,0,256,256).data);
renderer.draw(target,{},0);const first=pixels();renderer.draw(target,{},8);const second=pixels();
assert.equal(projections,1,'animation must reuse the cached sphere');
let outsideChanges=0;
for(let y=0;y<256;y++)for(let x=0;x<256;x++){
 const i=(y*256+x)*4,rr=Math.hypot(x+.5-128,y+.5-128);
 if(rr<95)assert.deepEqual(first.subarray(i,i+4),second.subarray(i,i+4),'opaque surface hides the overlay');
 if(rr>104&&first.subarray(i,i+4).some((v,c)=>v!==second[i+c]))outsideChanges++;
}
assert(outsideChanges>100,'changing prominence pixels exist outside the sphere');
renderer.draw(target,{glow:false},8);const hidden=pixels();
for(let y=0;y<256;y++)for(let x=0;x<256;x++)if(Math.hypot(x+.5-128,y+.5-128)>105)assert.equal(hidden[(y*256+x)*4+3],0,'hidden overlay leaves a clear rim');
assert.equal(projections,1,'hiding the light layer does not resample the sphere');
renderer.draw(target,{yaw:40,zoom:1.25},8);assert.equal(projections,2);
renderer.release();renderer.draw(target,{yaw:40,zoom:1.25},8);assert.equal(projections,3,'released cache is rebuilt on resume');
renderer.dispose();assert.equal(renderer.draw(target,{},0),false);
const frames=new Map();let id=0,draws=0;
const loop=Sun.motion(()=>draws++,{requestFrame(fn){frames.set(++id,fn);return id;},cancelFrame(i){frames.delete(i);}});
const tick=t=>{const batch=[...frames];for(const [i,fn] of batch){frames.delete(i);fn(t);}};
loop.start();loop.start();assert.equal(frames.size,1,'only one animation chain');
for(let t=0;t<=1000;t+=1000/60)tick(t);
assert(draws>=29&&draws<=31,'overlay drawing is capped at roughly 30 Hz');
const held=loop.time;loop.stop();assert.equal(frames.size,0);tick(100000);assert.equal(loop.time,held);
loop.start();tick(200000);assert.equal(loop.time,held,'resuming does not jump over hidden time');
tick(200050);assert(loop.time>held&&loop.time<held+.1);loop.dispose();loop.start();assert.equal(frames.size,0);
console.log('PASS: original moving solar limb, opaque sphere occlusion, unchanged surface during animation, bounded geometry, cache release, frame cap, pause/resume and disposal.');
