const assert=require('node:assert/strict'),M=require('../app/src/main/assets/moon-surface.js');
assert.equal(M.sample(1,1,180),null);
assert.equal(M.sample(0,0,180).u,.5);assert.equal(M.sample(0,0,180).v,.5);
assert.equal(M.sample(0,0,0).light,0);assert.equal(M.sample(0,0,180).light,1);
assert(M.sample(.5,0,90).light>.49);assert.equal(M.sample(-.5,0,90).light,0);
assert(M.sample(-.5,0,270).light>.49);assert.equal(M.sample(.5,0,270).light,0);
assert(M.sample(0,-.5,180).v<.5);
for(const [phase,sunward,brightX] of [[90,.7,1],[270,.7,-1]]){
 const a=M.rotation(sunward,phase),x=brightX*Math.cos(a),y=brightX*Math.sin(a);
 assert(Math.abs(x-Math.cos(sunward))<1e-10);
 assert(Math.abs(y-Math.sin(sunward))<1e-10);
}
let reads=0;
global.document={createElement(){return {width:0,height:0,getContext(){return {drawImage(){},getImageData(){reads++;return {data:new Uint8ClampedArray(16).fill(200)}}}}}}};
const target={width:8,getContext(){return {createImageData(w,h){return {data:new Uint8ClampedArray(w*h*4)}},putImageData(out){this.last=out}}}};
const image={width:2,height:2};M.draw(target,image,90);M.draw(target,image,270);
assert.equal(reads,1,'source image must be sampled only once');
console.log('PASS: lunar map coordinates and new/full/first/last-quarter illumination.');

assert(Math.abs(M.sample(0,0,180,{yaw:90}).u-.75)<1e-10);
assert(Math.abs(M.sample(0,0,180,{yaw:180}).u)<1e-10);
assert(M.sample(0,0,180,{pitch:45}).v<.3);
assert.equal(M.sample(0,0,0,{inspect:true}).light,1);
assert.equal(M.sample(0,0,180,{yaw:180}).light,0);
assert(M.sample(.8,.8,180,{zoom:2}));
assert(Math.abs(M.sample(.4,.2,90,{yaw:360}).u-M.sample(.4,.2,90,{yaw:0}).u)<1e-12);

// A self-luminous Sun must not inherit the Moon's new/full phase darkness.
let sunPixels;
const sunTarget={width:8,getContext(){return {createImageData(w,h){return {data:new Uint8ClampedArray(w*h*4)}},putImageData(out){sunPixels=out.data;}}}};
M.draw(sunTarget,image,0,{emissive:true,glow:false});const darkPhase=Array.from(sunPixels);
M.draw(sunTarget,image,180,{emissive:true,glow:false});assert.deepEqual(Array.from(sunPixels),darkPhase);
assert(sunPixels[(4*8+4)*4]>150);
