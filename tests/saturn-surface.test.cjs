const assert=require('node:assert/strict');
const Saturn=require('../app/src/main/assets/saturn-surface.js');
assert.equal(Saturn.ringColor(1.95,true),null,'Cassini division should separate the bright bands');
assert.equal(Saturn.ringColor(1.0,true),null);
assert(Saturn.ringColor(1.7,true).startsWith('rgba('));
const alpha=s=>Number(s.match(/,([0-9.]+)\)$/)[1]);
assert(alpha(Saturn.ringColor(1.7,true))>alpha(Saturn.ringColor(1.7,false)));

const events=[];
const ctx={save(){},restore(){},translate(){},rotate(){},scale(){},clearRect(){},beginPath(){},
 arc(x,y,r,start,end){this.arcSide=start===0?'front':'back';},stroke(){events.push(this.arcSide);},
 drawImage(){events.push('globe');}};
global.document={createElement(){return {width:0,height:0}}};
global.SkyMoonSurface={draw(target,image,phase,view){assert.equal(phase,180);assert(view.inspect);events.push('globe texture');}};
Saturn.draw({width:128,getContext:()=>ctx},{},{yaw:40,pitch:25,zoom:2});
const globe=events.indexOf('globe');
assert(globe>0&&events[globe-1]==='globe texture'&&events.slice(0,globe-1).every(x=>x==='back'));
assert(events.slice(globe+1).every(x=>x==='front'));
assert(events.includes('globe texture'));
console.log('PASS: Saturn ring division, rear/globe/front ordering and globe texture composition.');
