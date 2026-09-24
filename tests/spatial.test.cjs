const assert=require('node:assert/strict'),M=require('../app/src/main/assets/core.js');
let seed=20260924;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
const stars=Array.from({length:15598},(_,i)=>({id:i,mag:7*random(),v:M.vec(random()*360,Math.asin(2*random()-1)*180/Math.PI)})).sort((a,b)=>a.mag-b.mag);
const index=M.starIndex(stars);let total=0,baseline=0;
for(let i=0;i<120;i++){
 const b=M.basis(random()*360,random()*180-90),w=i%2?390:844,h=i%2?844:390,fov=[12,45,85,110][i%4],roll=random()*Math.PI*2,limit=[3,5,7][i%3];
 const candidates=index.query(b,w,h,fov,limit),set=new Set(candidates),p=M.projector(b,w,h,fov,roll);
 const eligible=stars.filter(s=>s.mag<=limit);total+=candidates.length;baseline+=eligible.length;
 for(const s of eligible){const q=p(s.v);if(q&&q[0]>=-15&&q[0]<=w+15&&q[1]>=-15&&q[1]<=h+15)assert(set.has(s),'visible star omitted');}
 assert.deepEqual(candidates,eligible.filter(s=>set.has(s)),'draw order changed');
}
const grid=M.hitGrid(),points=Array.from({length:3000},(_,i)=>({s:i,x:random()*900-30,y:random()*900-30}));
for(const p of points)grid.add(p.s,p.x,p.y);
for(let i=0;i<1000;i++){
 const x=random()*900,y=random()*900;let best=28**2,expected=null;
 for(const p of points){const d=(x-p.x)**2+(y-p.y)**2;if(d<best){best=d;expected=p.s;}}
 assert.equal(grid.nearest(x,y),expected);
}
grid.clear();assert.equal(grid.nearest(0,0),null);
grid.add('first',57,0);grid.add('second',55,0);assert.equal(grid.nearest(56,0),'first');
grid.clear();grid.add('edge',28,0);assert.equal(grid.nearest(0,0),null);
console.log('PASS: 120 rotated/portrait/landscape frustums omit no visible stars; 1000 grid picks match brute force.');
console.log('Synthetic catalog candidate reduction: '+(100*(1-total/baseline)).toFixed(1)+'% (not a device FPS measurement).');
