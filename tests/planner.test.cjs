const assert=require('node:assert/strict');
const A=require('../app/src/main/assets/astronomy.js');
const P=require('../app/src/main/assets/planner.js');
const start=new Date('2026-03-20T12:00:00Z');
const p=P.build(A,0,0,start);
assert(p.dark.length>0);assert(p.moonFraction>=0&&p.moonFraction<=1);
for(const x of [...p.dark,...p.targets.flatMap(t=>t.windows)])assert(x.start>=+start&&x.end<=+start+86400000&&x.end>x.start);
function altitude(id,time){const t=new Date(time),o=new A.Observer(0,0,0),eq=A.Equator(id,t,o,true,true);return A.Horizon(t,o,eq.ra,eq.dec,'normal').altitude;}
for(const target of p.targets){if(!target.best){assert.equal(target.windows.length,0);continue;}assert(altitude('Sun',target.best.time)<=-6);assert(altitude(target.id,target.best.time)>=20);assert(target.windows.some(x=>target.best.time>=x.start&&target.best.time<=x.end));}
assert.equal(P.build(A,89,0,new Date('2026-06-21T00:00:00Z')).dark.length,0);
const polar=P.build(A,89,0,new Date('2026-12-21T00:00:00Z'));assert.equal(polar.dark.length,1);assert.equal(polar.dark[0].end-polar.dark[0].start,86400000);
assert.throws(()=>P.build(A,91,0,start));
console.log('PASS: planner time bounds, physical visibility thresholds, polar day/night and invalid coordinates.');

const night=Date.parse('2026-03-20T00:00:00Z'),day=Date.parse('2026-03-20T12:00:00Z');
const hints=P.weatherHints(A,0,0,[[night,20,10,10000],[night+3600000,85,70,1000],[night+7200000,-1,10,10000],[day,10,10,10000],[night-3600000,0,0,10000]],night);
assert.equal(hints.length,4);assert.equal(hints[0].clear,true);assert(hints[0].sun<-12);
assert.equal(hints[1].label,'天气模型不理想');assert.equal(hints[2].label,'天气数据不足');
assert.equal(hints[3].label,'天光较亮');assert.equal(hints[3].clear,false);
assert.throws(()=>P.weatherHints(A,91,0,[],night));
console.log('PASS: weather hints use actual Sun altitude, known forecast fields and future samples only.');

for(const date of ['2026-09-22T00:00:00Z','2026-12-30T12:00:00Z','2024-02-29T23:59:00Z']){
 const start=new Date(date),calendar=P.moonCalendar(A,start);
 assert.equal(calendar.events.length,8);assert(calendar.fraction>=0&&calendar.fraction<=1);
 let previous=+start,quarter=null;
 for(const event of calendar.events){assert(event.time>previous);if(quarter!==null){assert.equal(event.quarter,(quarter+1)%4);assert(event.time-previous>5*86400000&&event.time-previous<9*86400000);}const error=((A.MoonPhase(new Date(event.time))-event.quarter*90+540)%360)-180;assert(Math.abs(error)<0.001);previous=event.time;quarter=event.quarter;}
}
assert.throws(()=>P.moonCalendar(A,new Date('invalid')));assert.throws(()=>P.moonCalendar(A,new Date(),100));
console.log('PASS: lunar event sequence, phase angles, year rollover, leap day and input bounds.');
