const assert=require('node:assert/strict'),B=require('../app/src/main/assets/backup.js');
const allowed=new Set(['Moon','Sun']),saved={Moon:'本机记录'};
const out=B.merge(B.encode({Moon:'旧备份',Sun:'新导入',unknown:'跳过'}),saved,allowed);
assert.equal(out.notes.Moon,'本机记录');assert.equal(out.notes.Sun,'新导入');assert.equal(out.added,1);assert.equal(out.kept,1);assert.equal(out.skipped,1);assert.equal(saved.Sun,undefined);
for(const text of ['{','null','[]',JSON.stringify({app:'Other',version:1,notes:{}}),JSON.stringify({app:'Starlight',version:2,notes:{}}),'a'.repeat(2000001)])assert.throws(()=>B.merge(text,{},allowed));
const hostile='{"app":"Starlight","version":1,"notes":{"__proto__":{"polluted":true},"Sun":123}}';assert.equal(B.merge(hostile,{},allowed).skipped,2);assert.equal({}.polluted,undefined);
assert.equal(B.merge(B.encode({Sun:'x'.repeat(2001)}),{},allowed).skipped,1);
console.log('PASS: backup validation, non-overwriting merge, size bounds, unknown IDs and prototype protection.');
