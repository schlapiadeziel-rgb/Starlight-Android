const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=fs.readFileSync(path.resolve(__dirname,'../app/src/main/assets/messier.js'),'utf8');
const objects=vm.runInNewContext(source+'\nMESSIER_DATA;');
assert.equal(objects.length,110);
assert.deepEqual(Array.from(objects,x=>x[0]),Array.from({length:110},(_,i)=>i+1));
for(const [id,name,ra,dec,mag,type,con] of objects){
 assert(Number.isInteger(id)&&id>=1&&id<=110);
 assert(typeof name==='string'&&Number.isFinite(ra)&&ra>=0&&ra<24);
 assert(Number.isFinite(dec)&&Math.abs(dec)<=90&&Number.isFinite(mag));
 assert(type&&con);
}
const get=id=>objects[id-1];
assert.equal(get(31)[1],'仙女座星系');assert(Math.abs(get(31)[3]-41.27)<.1);
assert.equal(get(42)[1],'猎户座大星云');assert(Math.abs(get(42)[2]-5.59)<.15);
assert.equal(get(45)[1],'昴星团');assert.equal(get(40)[5],'双星');
console.log('PASS: 110 complete, ordered Messier objects, coordinates, types and landmark identities.');
