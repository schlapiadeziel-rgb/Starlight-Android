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
// Alternating source columns must average when the disc is smaller than the texture,
// instead of picking a single stripe. A uniform field stays uniform after the same filter.
let bound=null;
global.document={createElement(){return {width:1,height:1,getContext(){return {drawImage(img){bound=img;},getImageData(){return {data:bound.pixels};}}}}}};
function paint(pixels,width,height,size,phase,view){
 const ctx={createImageData(w,h){return {data:new Uint8ClampedArray(w*h*4)}},putImageData(out){this.last=out;}};
 M.draw({width:size,getContext:()=>ctx},{width,height,pixels},phase,view);return ctx.last.data;
}
const stripes=new Uint8ClampedArray(64*32*4);
for(let y=0;y<32;y++)for(let x=0;x<64;x++){const i=(y*64+x)*4,v=x%2?255:0;stripes[i]=stripes[i+1]=stripes[i+2]=v;stripes[i+3]=255;}
const down=paint(stripes,64,32,8,180);const center=(4*8+4)*4;
assert(down[center]>90&&down[center]<170,'minified high-frequency albedo averages instead of aliasing');
const flat=new Uint8ClampedArray(64*32*4).fill(180);flat.forEach((_,i)=>{if(i%4===3)flat[i]=255;});
const even=paint(flat,64,32,8,180);assert(Math.abs(even[center]-even[center+1])<1);assert(Math.abs(even[center]-down[center])>5);
const quarter=paint(flat,64,32,32,90),right=(16*32+24)*4,left=(16*32+8)*4;
assert(quarter[right]>quarter[left]*5,'first-quarter lit limb stays brighter than the dark limb');
assert(quarter[left]<30,'unlit limb keeps only a faint earthshine floor');
