const assert=require('node:assert/strict'),L=require('../app/src/main/assets/labels.js');
const candidate=(id,x,y,priority=50)=>({id,name:id,x,y,priority,radius:6,size:12,width:52});
const overlap=(a,b)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
// Several objects at the same projected location must never print on top of one another.
const crowded=[candidate('star',160,180,50),candidate('constellation',160,180,30),candidate('selected',160,180,100),candidate('planet',160,180,80),candidate('faint',160,180,10)];
let result=L.layout(crowded,320,480);
assert.equal(result[0].id,'selected');
assert(result.length<crowded.length);
for(let i=0;i<result.length;i++)for(let j=i+1;j<result.length;j++)assert(!overlap(result[i].box,result[j].box));
// Toolbars and a nearby planet are separate exclusion regions; alternate placements stay local.
const toolbar={left:200,top:0,right:320,bottom:400},planet={left:141,top:192,right:180,bottom:220};
result=L.layout([candidate('Vega',160,180)],320,480,[toolbar],[planet]);
assert.equal(result.length,1);assert(result[0].box.bottom<180);
assert(!overlap(result[0].box,toolbar));assert(!overlap(result[0].box,planet));
// Reversing orientation uses the new viewport; long or offscreen labels may be omitted.
for(const [w,h] of [[320,640],[640,320],[280,280]]){
 result=L.layout([candidate('edge',w-10,h-10),candidate('top',10,10),candidate('center',w/2,h/2)],w,h);
 assert(result.length>=1);
 for(const r of result)assert(r.box.left>=6&&r.box.right<=w-6&&r.box.top>=6&&r.box.bottom<=h-6);
}
assert.equal(L.layout([{...candidate('too-wide',100,100),width:1000}],320,480).length,0);
assert.equal(L.layout([candidate('invalid',NaN,100)],320,480).length,0);
assert.equal(L.layout([candidate('same',150,150),candidate('same',250,250)],320,480).length,1);
assert.deepEqual(L.layout(crowded,320,480),L.layout(crowded,320,480));
console.log('PASS: label priority, collision avoidance, HUD exclusion, edge placement and deterministic layout.');
