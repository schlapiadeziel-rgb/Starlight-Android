const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict'),Art=require('../app/src/main/assets/art.js');
const root=__dirname+'/../app/src/main/assets/',ctx=vm.createContext({});
for(const f of fs.readdirSync(root).filter(f=>/^stars-\d+\.js$/.test(f)).sort().concat('art-data.js'))vm.runInContext(fs.readFileSync(root+f,'utf8'),ctx);
const data=vm.runInContext('ART_DATA',ctx),stars=vm.runInContext('STAR_DATA',ctx),lookup=new Map(stars.map(s=>{const a=s[2]*Math.PI/12,d=s[3]*Math.PI/180;return [s[8],[Math.cos(d)*Math.cos(a),Math.cos(d)*Math.sin(a),Math.sin(d)]]}));
const packed=JSON.parse(require('child_process').execFileSync('python3',['-c',"import zipfile,json; print(json.dumps(zipfile.ZipFile('app/artwork.zip').namelist()))"],{cwd:__dirname+'/..',encoding:'utf8'}));
assert.equal(data.length,85);
for(const d of data){assert(fs.existsSync(root+'art/'+d.file.split('/').pop())||packed.includes('art/'+d.file.split('/').pop()));const mesh=Art.mesh(d,id=>lookup.get(id));assert(mesh,'missing HIP anchor');
 for(const a of d.anchors){const p=mesh.at(...a.pos),expected=lookup.get(a.hip);assert(Math.hypot(...p.map((n,i)=>n-expected[i]))<1e-10);}
 mesh.center.v=mesh.center.eq;assert(Art.visible(mesh,{f:mesh.center.eq},400,800,55));
 for(const p of mesh.points)assert(Math.abs(Math.hypot(...p.eq)-1)<1e-10);
}
assert.equal(Art.mesh(data[0],()=>null),null);
console.log('PASS: all 85 illustration assets and 255 HIP anchors, normalized spherical meshes, missing-star handling.');
