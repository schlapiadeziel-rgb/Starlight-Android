const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict'),Art=require('../app/src/main/assets/art.js');
const root=__dirname+'/../app/src/main/assets/',ctx=vm.createContext({});
for(const f of fs.readdirSync(root).filter(f=>/^stars-\d+\.js$/.test(f)).sort().concat('art-data.js'))vm.runInContext(fs.readFileSync(root+f,'utf8'),ctx);
const data=vm.runInContext('ART_DATA',ctx),stars=vm.runInContext('STAR_DATA',ctx),lookup=new Map(stars.map(s=>{const a=s[2]*Math.PI/12,d=s[3]*Math.PI/180;return [s[8],[Math.cos(d)*Math.cos(a),Math.cos(d)*Math.sin(a),Math.sin(d)]]}));
assert.equal(data.length,6);
for(const d of data){assert(fs.existsSync(root+'art/'+d.file.split('/').pop()));const mesh=Art.mesh(d,id=>lookup.get(id));assert(mesh,'missing HIP anchor');
 for(const a of d.anchors){const p=mesh.at(...a.pos),expected=lookup.get(a.hip);assert(Math.hypot(...p.map((n,i)=>n-expected[i]))<1e-10);}
 for(const p of mesh.points)assert(Math.abs(Math.hypot(...p.eq)-1)<1e-10);
}
assert.equal(Art.mesh(data[0],()=>null),null);
console.log('PASS: all six illustration assets and 18 HIP anchors, normalized spherical meshes, missing-star handling.');
