const assert=require('node:assert/strict');
const {look}=require('../app/src/main/assets/iss.js');
const above=look(40,116,40,116,410);
assert(Math.abs(above.alt-90)<1e-9);assert(Math.abs(above.range-410)<1e-8);
const east=look(0,0,0,5,410);assert(east.az>85&&east.az<95);assert(east.alt>0&&east.alt<90);
const west=look(0,0,0,-5,410);assert(west.az>265&&west.az<275);
const below=look(0,0,0,180,410);assert(below.alt<0);
assert.throws(()=>look(91,0,0,0,410));assert.throws(()=>look(0,0,0,0,NaN));
console.log('PASS: ISS overhead, east/west bearing, below-horizon range and invalid coordinates.');
