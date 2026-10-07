const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const Features=require('../app/src/main/assets/moon-features.js'),Surface=require('../app/src/main/assets/moon-surface.js'),Labels=require('../app/src/main/assets/labels.js'),{createCanvas}=require('@napi-rs/canvas');
const data=vm.runInNewContext(fs.readFileSync('app/src/main/assets/moon-features-data.js','utf8')+'\nMOON_FEATURE_DATA');
assert.equal(data.length,40);assert.equal(new Set(data.map(f=>f.id)).size,40);
for(const f of data)assert(f.name&&f.en&&Math.abs(f.lat)<=90&&Math.abs(f.lon)<=180&&f.diameter>0);
// Independent directory snapshots include east/west and near/far-side centers.
for(const [id,en,lat,lon,diameter] of [[1296,'Copernicus',9.62,-20.08,96.07],[6163,'Tycho',-43.30,-11.22,85.29],[6108,'Tsiolkovskiy',-20.38,128.97,184.39],[3678,'Mare Imbrium',34.72,-14.91,1145.53]]){
 const f=data.find(f=>f.id===id);assert(f);assert.equal(f.en,en);assert.equal(f.lat,lat);assert.equal(f.lon,lon);assert.equal(f.diameter,diameter);
}
const near=data.find(f=>f.en==='Copernicus'),far=data.find(f=>f.en==='Tsiolkovskiy');
assert(Features.project(near).front>0);assert(Features.project(far).front<0);
assert.equal(Features.visible(data,{},320,320,0).length,0,'new-moon front-side labels are hidden with the dark surface');
assert(!Features.visible(data,{},320,320,180).some(p=>p.feature.id===far.id));
assert(Features.visible(data,{yaw:128.97,pitch:-20.38,inspect:true},320,320,180).some(p=>p.feature.id===far.id));
let comparisons=0;
for(const f of data)for(const yaw of [0,60,180,300])for(const pitch of [-50,0,50])for(const zoom of [1,2,4]){
 const view={yaw,pitch,zoom,inspect:true},p=Features.project(f,view,480,480,180);
 if(p.front<=.025)continue;
 const sampled=Surface.sample((p.x/480*2-1),(p.y/480*2-1),180,view);assert(sampled);
 const longitude=(sampled.u-.5)*360,latitude=(.5-sampled.v)*180;
 assert(Math.abs((longitude-f.lon+180)%360-180)<1e-9);assert(Math.abs(latitude-f.lat)<1e-9);comparisons++;
}
for(const f of data){const p=Features.project(f,{yaw:f.lon,pitch:f.lat,zoom:2,inspect:true},320,320);assert(Math.abs(p.x-160)<1e-9&&Math.abs(p.y-160)<1e-9);}
const visible=Features.visible(data,{yaw:near.lon,pitch:near.lat,zoom:2,inspect:true},320,320,180),center=visible.find(p=>p.feature.id===near.id);
assert.equal(Features.pick(visible,center.x+4,center.y+4),near);assert.equal(Features.pick([],160,160),null);assert.equal(Features.pick([{...center,x:100,y:100}],0,0),null);
const target=createCanvas(320,320),ctx=target.getContext('2d');let placed;
Features.draw(ctx,visible,320,320,near.id,{layout(...args){placed=Labels.layout(...args);return placed;}});
assert(placed.some(p=>p.id==='moon'+near.id),'selected feature gets first choice of label placement');
for(let i=0;i<placed.length;i++)for(let j=i+1;j<placed.length;j++){
 const a=placed[i].box,b=placed[j].box;assert(!(a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top));
}
console.log(`PASS: 40 official directory centers, ${comparisons} inverse texture/marker comparisons, far-side and dark-side hiding, centering, bounded picking and selected label collision avoidance.`);
