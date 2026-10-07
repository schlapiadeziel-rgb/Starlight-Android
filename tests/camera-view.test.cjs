const assert=require('node:assert/strict'),View=require('../app/src/main/assets/camera-view.js'),M=require('../app/src/main/assets/core.js');
const D=Math.PI/180,near=(a,b)=>assert(Math.abs(a-b)<1e-9,`${a} != ${b}`);
for(const base of [1,13,25,45,60,85,110,150])for(const scale of [.5,.7,1,1.4,2]){
 const result=View.apply(base,scale);assert(result.fov>=1&&result.fov<=170);
 if(!result.limited){
  const basis=M.basis(0,0),ray=M.vec(8,0),original=M.project(ray,basis,800,400,base),adjusted=M.project(ray,basis,800,400,result.fov);
  near((original[0]-400)/(adjusted[0]-400),scale);
 }
}
for(const base of [12,25,45,60,78,85,110])for(const scale of [.7,.85,1,1.2,1.4]){
 const expected=Math.max(12,Math.min(110,base*scale)),migrated=View.migrate(base,scale);
 near(View.apply(base,migrated).fov,expected);
}
assert(View.apply(1,.5).limited);assert(View.apply(169,2).limited);
for(const value of [NaN,Infinity,-1,0,'60',null]){assert.equal(View.angle(value),45);assert(Number.isFinite(View.apply(value).fov));}
assert.equal(View.scale(NaN),1);assert.equal(View.scale(.1),.5);assert.equal(View.scale(3),2);
assert(View.sourceName(0).includes('报告'));assert(View.sourceName(1).includes('估计'));assert(View.sourceName(2).includes('未报告'));
console.log('PASS: AR tangent-plane width calibration, pixel scale ratios, old angle-setting migration, source labels and limits.');
