const {JSDOM}=require('jsdom'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {createCanvas,loadImage}=require('@napi-rs/canvas');
const root=path.resolve(__dirname,'../app/src/main/assets'),provenance=JSON.parse(fs.readFileSync(path.join(__dirname,'../licenses/planet-textures-source.json'),'utf8'));
const dom=new JSDOM(fs.readFileSync(path.join(root,'index.html'),'utf8'),{url:'https://app.starlight.local/',runScripts:'outside-only'}),w=dom.window,frames=new Map();let sequence=0;
Object.defineProperty(w.document,'hidden',{configurable:true,value:false});
w.requestAnimationFrame=fn=>{frames.set(++sequence,fn);return sequence;};w.cancelAnimationFrame=id=>frames.delete(id);w.setInterval=()=>{};
w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;};
w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}}),measureText:t=>({width:t.length*10})},{get:(o,k)=>k in o?o[k]:()=>{}});
for(const script of w.document.querySelectorAll('script[src]'))vm.runInContext(fs.readFileSync(path.join(root,script.getAttribute('src')),'utf8'),dom.getInternalVMContext());
const run=s=>vm.runInContext(s,dom.getInternalVMContext()),body=()=>w.document.getElementById('sheetBody');
let latest,drawn,autoLoad=true;w.Image=class{constructor(){latest=this;}set src(v){this.value=v;if(v&&autoLoad)this.onload?.();}};
w.SkyMoonSurface.draw=(target,image,phase,view)=>{drawn={target,image,phase,view:{...view}};};
function tick(){for(const [id,fn] of [...frames])if(frames.delete(id))fn(1000);}
for(const record of provenance.textures){
 run(`showSurface('${record.body}')`);assert.equal(latest.value,record.file);
 assert(body().textContent.includes(run(`planetSurfaces.${record.body}.name`)));assert(!body().querySelector('#moonFeature'));
 assert(![...body().querySelectorAll('button')].some(b=>b.textContent.includes('月相')));
 tick();assert.equal(drawn.image,latest);assert(drawn.view.inspect);assert(drawn.phase>=0&&drawn.phase<=180);assert(drawn.view.light&&Math.abs(Math.hypot(...drawn.view.light)-1)<1e-10);
 const sphere=body().querySelector('.surface-globe');sphere.dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));sphere.dispatchEvent(new w.KeyboardEvent('keydown',{key:'+',bubbles:true}));tick();assert.equal(drawn.view.yaw,10);assert.equal(drawn.view.zoom,1.25);
 const old=latest;w.document.getElementById('close').click();w.document.getElementById('sheet').dispatchEvent(new w.Event('close'));assert.equal(old.onload,null);assert.equal(old.value,'');assert.equal(sphere.width,0);
}
autoLoad=false;run("showSurface('Mars')");latest.onerror();assert(body().querySelector('.surface-feedback').textContent.includes('失败'));w.document.getElementById('close').click();w.document.getElementById('sheet').dispatchEvent(new w.Event('close'));
// At most one full-size sky texture is loading. Completed icon sampling data
// and cancelled images are released; hidden/below-horizon objects have no hits.
run('releasePlanetSprites();planetSprite("Mercury");planetSprite("Venus")');assert.equal(latest.value,'textures/mercury.jpg');const pending=latest;run('nativeAppPaused();dirty=true;render()');assert.equal(pending.onload,null);assert.equal(pending.value,'');assert(run('dirty'));run('nativeAppResumed()');
run('tracking=false;ar=false;cfg.horizon=true;selected=starsByMagnitude.find(s=>s.alt<-10);az=selected.az;alt=selected.alt;dirty=true;render()');assert.equal(run('hit.nearest(width/2,height/2)'),null);
run('cfg.horizon=false;dirty=true;render()');assert(run('hit.nearest(width/2,height/2)===selected'));
// Decode the actual offline images and exercise the production sphere renderer.
global.document={createElement:()=>createCanvas(1,1)};const surface=require('../app/src/main/assets/moon-surface.js');
(async()=>{for(const record of provenance.textures){
 const bytes=fs.readFileSync(path.join(root,record.file));assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),record.sha256);
 const image=await loadImage(bytes);assert.equal(image.width,2048);assert.equal(image.height,1024);
 const target=createCanvas(256,256);surface.draw(target,image,180,{inspect:true,yaw:0});const front=target.toBuffer('image/png');
 const c=target.getContext('2d');assert.equal(c.getImageData(0,0,1,1).data[3],0);assert.equal(c.getImageData(128,128,1,1).data[3],255);
 surface.draw(target,image,180,{inspect:true,yaw:130,pitch:30,zoom:1.8});assert(!front.equals(target.toBuffer('image/png')));surface.release(image);
}console.log('PASS: five verified offline planet maps, individual viewer identity/rotation/zoom, error/close/pause cleanup, one pending sky map and horizon hit exclusion.');dom.window.close();})().catch(e=>{console.error(e);process.exitCode=1;});
