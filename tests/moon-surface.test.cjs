const assert=require('node:assert/strict'),M=require('../app/src/main/assets/moon-surface.js');
assert.equal(M.sample(1,1,180),null);
assert.equal(M.sample(0,0,180).u,.5);assert.equal(M.sample(0,0,180).v,.5);
assert.equal(M.sample(0,0,0).light,0);assert.equal(M.sample(0,0,180).light,1);
assert(M.sample(.5,0,90).light>.49);assert.equal(M.sample(-.5,0,90).light,0);
assert(M.sample(-.5,0,270).light>.49);assert.equal(M.sample(.5,0,270).light,0);
assert(M.sample(0,-.5,180).v<.5);
console.log('PASS: lunar map coordinates and new/full/first/last-quarter illumination.');
