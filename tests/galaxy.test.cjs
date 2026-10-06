const assert=require('node:assert/strict'),A=require('../app/src/main/assets/astronomy.js'),M=require('../app/src/main/assets/core.js'),G=require('../app/src/main/assets/galaxy.js');
const dot=(a,b)=>a.reduce((sum,x,i)=>sum+x*b[i],0),D=Math.PI/180;
const near=(a,b,message)=>assert(Math.abs(a-b)<1e-9,message+': '+a+' != '+b);
let seed=93026;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
// The shader ray must agree with the chart inverse projection and an
// independent Astronomy Engine horizon -> J2000 -> galactic conversion.
for(let i=0;i<800;i++){
 const t=new Date(Date.UTC(2025+i%5,i%12,1+i%28,i%24)),obs=new A.Observer(random()*178-89,random()*360-180,0);
 const galToHor=A.CombineRotation(A.Rotation_GAL_EQJ(),A.Rotation_EQJ_HOR(t,obs));
 const axes=galToHor.rot.map(row=>[-row[1],row[0],row[2]]);
 const w=i%2?390:844,h=i%2?844:390,fov=[12,35,65,85,110][i%5],roll=random()*2*Math.PI,b=M.basis(random()*360,random()*170-85);
 const f=G.frame(b,axes,w,h,fov,roll),x=random()*w,y=random()*h;
 const cx=(2*x/w-1)*f.scale[0],cy=(1-2*y/h)*f.scale[0]*f.scale[1],n=Math.hypot(cx,cy,1);
 const shader=f.forward.map((v,j)=>(v+f.right[j]*cx+f.up[j]*cy)/n);
 const hor=M.unproject(x,y,b,w,h,fov,roll),eq=A.RotateVector(A.Rotation_HOR_EQJ(t,obs),new A.Vector(hor[1],-hor[0],hor[2],t));
 const gal=A.RotateVector(A.Rotation_EQJ_GAL(),eq);
 for(const [j,value] of [gal.x,gal.y,gal.z].entries())near(shader[j],value,'catalog/photograph ray alignment');
 near(dot([cx/n,cy/n,1/n],f.vertical),hor[2],'horizon mask remains aligned with the chart');
 const uv=G.uv(shader);assert(uv[0]>=0&&uv[0]<1&&uv[1]>=0&&uv[1]<=1);
}
near(G.uv([1,0,0])[0],.5,'galactic center');near(G.uv([0,1,0])[0],.25,'longitude increases left');near(G.uv([0,-1,0])[0],.75,'negative longitude');
near(G.uv([0,0,1])[1],0,'north at top');near(G.uv([0,0,-1])[1],1,'south at bottom');
const left=G.uv([-1,1e-7,0]),right=G.uv([-1,-1e-7,0]);assert(left[0]<1e-6&&right[0]>1-1e-6,'continuous wrapped longitude seam');
assert.equal(G.uv([0,0,0]),null);assert.equal(G.frame(M.basis(0,0),[],0,800,85),null);
// No network or GPU work until the layer is requested. Failed files are not
// re-requested on every phone movement, and closing while loading cancels it.
let loads=0,notifications=0;const images=[];
global.Image=class {constructor(){images.push(this);}set src(value){this.value=value;if(value)loads++;}};
const r=G.create(()=>notifications++),b=M.basis(0,40),axes=[[1,0,0],[0,1,0],[0,0,1]],c={drawImage(){throw Error('not ready');}};
assert.equal(loads,0);for(let i=0;i<20;i++)assert.equal(r.draw(c,b,axes,390,844,85),false);assert.equal(loads,1);
images[0].onerror();assert.equal(notifications,1);r.release();assert.equal(r.draw(c,b,axes,390,844,85),false);assert.equal(loads,1,'failed images stay in fallback');
const pending=G.create();pending.draw(c,b,axes,390,844,85);pending.release();assert.equal(images[1].onload,null);assert.equal(images[1].value,'');
pending.draw(c,b,axes,390,844,85);assert.equal(loads,3);pending.dispose();assert.equal(pending.draw(c,b,axes,390,844,85),false);assert.equal(loads,3);
console.log('PASS: 800 photographic/catalog projection alignments, roll, horizon, wrap/poles, lazy loading, cancellation and failure fallback.');
