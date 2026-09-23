const assert=require('node:assert/strict');
const V=require('../app/src/main/assets/visual.js');
const A=require('../app/src/main/assets/astronomy.js');
// Real Sun positions at Greenwich noon and midnight on an equinox drive the visual state.
function sunAltitude(time){const obs=new A.Observer(0,0,0),eq=A.Equator('Sun',new Date(time),obs,true,true);return A.Horizon(new Date(time),obs,eq.ra,eq.dec,'normal').altitude;}
const noon=sunAltitude('2026-03-20T12:00:00Z'),midnight=sunAltitude('2026-03-20T00:00:00Z');
assert(noon>80&&midnight< -80);
assert.equal(V.visibility(2,noon),0);assert(V.visibility(6,midnight)>.6);
assert(V.visibility(0,-8)>V.visibility(5,-8));
assert.notDeepEqual(V.palette(noon),V.palette(midnight));
assert.deepEqual(V.palette(noon,true),V.palette(midnight,true));
assert.equal(V.colorIndex(-.2),0);assert.equal(V.colorIndex(1.8),4);
console.log('PASS: day/night Sun positions, twilight star fading, stable night palette and spectral colors.');
