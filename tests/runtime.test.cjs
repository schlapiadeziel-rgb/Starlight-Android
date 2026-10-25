const assert=require('node:assert/strict'),Runtime=require('../app/src/main/assets/runtime.js');
function clock(){let time=0,seq=0;const jobs=new Map(),stats={frames:0,timers:0};return {jobs,stats,now:()=>time,
 setTimer(fn,ms){stats.timers++;jobs.set(++seq,{time:time+ms,fn,kind:'timer'});return seq;},clearTimer:id=>jobs.delete(id),
 requestFrame(fn){stats.frames++;jobs.set(++seq,{time:time+16,fn,kind:'frame'});return seq;},cancelFrame:id=>jobs.delete(id),
 advance(ms){const end=time+ms;let count=0;while(true){const next=[...jobs].sort((a,b)=>a[1].time-b[1].time)[0];if(!next||next[1].time>end)break;if(++count>10000)throw Error('Busy timer loop');jobs.delete(next[0]);time=next[1].time;next[1].fn();}time=end;}};}
const c=clock();let draws=0,ticks=0,due=30000;const loop=Runtime.create({...c,frameNow:c.now,draw:()=>draws++,tick:()=>{ticks++;due=c.now()+30000;},deadline:()=>due});
loop.resume();for(let i=0;i<10000;i++)loop.request();assert.equal(c.stats.frames,1);c.advance(1000);assert.equal(draws,1);assert.equal(c.jobs.size,1);assert.equal([...c.jobs.values()][0].kind,'timer');
c.advance(28999);assert.equal(ticks,1);assert.equal(c.stats.frames,1,'idle must not request any more animation frames');c.advance(1);assert.equal(ticks,2);assert.equal(draws,1);
for(let i=0;i<60;i++){loop.request();c.advance(1000/60);}assert(draws<=34&&draws>=28,'60Hz input should retain responsive bounded 32ms frames');
const stale=[...c.jobs.values()].map(x=>x.fn),before=[draws,ticks];loop.pause();assert.equal(c.jobs.size,0);for(const fn of stale)fn();c.advance(600000);assert.deepEqual([draws,ticks],before);
loop.resume();c.advance(16);assert.equal(ticks,before[1]+1);assert.equal(draws,before[0]+1);loop.dispose();loop.resume();loop.request();assert.equal(c.jobs.size,0);
// Monotonic frame timing is independent of changes to the wall clock.
const d=clock();let wall=50000,count=0;const rewind=Runtime.create({...d,now:()=>wall,frameNow:d.now,draw:()=>count++,tick(){},deadline:()=>wall+30000});rewind.resume();d.advance(16);wall-=100000;rewind.request();d.advance(48);assert.equal(count,2);rewind.dispose();
console.log('PASS: 10000 invalidations coalesce, zero extra idle frames, single deadline, bounded 60Hz input, pause/stale callbacks, resume/disposal and wall-clock rollback.');
