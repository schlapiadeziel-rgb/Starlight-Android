const assert=require('node:assert/strict');
const photo=require('../app/src/main/assets/deep-photo.js');
let canvases=0,draws=0,masked=0;
const ctx={drawImage(){draws++;},save(){},restore(){},translate(){},scale(){},fillRect(){masked++;},createRadialGradient(){return {addColorStop(){}}}};
global.document={createElement(){canvases++;return {width:0,height:0,getContext:()=>ctx}}};
const galaxy={naturalWidth:960,naturalHeight:715},nebula={naturalWidth:800,naturalHeight:1875};
const a=photo.sprite(galaxy),b=photo.sprite(nebula);
assert.equal(a.width,320);assert.equal(a.height,238);
assert.equal(b.width,137);assert.equal(b.height,320);
assert.equal(photo.sprite(galaxy),a,'repainting should reuse the softened source');
assert.equal(canvases,2);assert.equal(draws,2);assert.equal(masked,2);
// High-density previews must retain enough original pixels without rebuilding
// on every zoom step, accumulating caches, or enlarging a low-resolution source.
assert.equal(photo.sprite(galaxy,510),a);assert.equal(a.width,640);assert.equal(a.height,477);
assert.equal(canvases,2);assert.equal(draws,3);assert.equal(masked,3);
assert.equal(photo.sprite(galaxy,160),a);assert.equal(a.width,640);assert.equal(draws,3,'zooming out retains the sharper cached source');
assert.equal(photo.sprite(galaxy,10000),a);assert.equal(a.width,960);assert.equal(a.height,715);assert.equal(draws,4);
assert.equal(photo.sprite(nebula,900),b);assert.equal(b.width,437);assert.equal(b.height,1024);assert.equal(canvases,2);
const small=photo.sprite({naturalWidth:20,naturalHeight:10},1000);assert.equal(small.width,20);assert.equal(small.height,10);
assert.equal(photo.sprite(galaxy,NaN),a);assert.equal(photo.sprite(galaxy,-1),a);
assert.equal(photo.sprite({naturalWidth:0,naturalHeight:0}),null);
assert.equal(photo.sprite({naturalWidth:Infinity,naturalHeight:100}),null);
assert.equal(ctx.imageSmoothingEnabled,true);assert.equal(ctx.imageSmoothingQuality,'high');
assert(photo.size('M42',65)<photo.size('M31',65));
assert(photo.size('M31',12)>photo.size('M31',85));
console.log('PASS: deep-sky previews retain aspect ratios, upgrade resolution in one bounded cache, never upscale sources, and retain display-size bounds.');
