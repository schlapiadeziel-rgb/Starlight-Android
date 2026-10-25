const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{JSDOM}=require('jsdom');
const Atlas=require('../app/src/main/assets/atlas.js');let requests=[],live=new Set(),peak=0,draws=0,notifications=[];
global.Image=class{constructor(){requests.push(this);}set src(v){this.value=v;if(v){live.add(this);peak=Math.max(peak,live.size);}else live.delete(this);}};
global.SkyMoonSurface={draw(){draws++;},release(){}};global.SkySaturn={draw(){draws++;}};
const items=Array.from({length:9},(_,i)=>({file:'planet'+i,canvas:{width:160,height:160},saturn:i===6,solar:i===0}));
const atlas=Atlas.create(items,(item,ok)=>notifications.push([item.file,ok]));assert.equal(requests.length,1);
const old=requests[0],stale=old.onload;atlas.pause();assert.equal(old.onload,null);assert.equal(old.value,'');stale();assert.equal(draws,0);atlas.resume();assert.equal(requests[1].value,'planet0');
for(let i=0;i<9;i++){const image=requests[requests.length-1];i===4?image.onerror():image.onload();}
assert.equal(peak,1);assert.equal(draws,8);assert.equal(notifications.length,9);assert.equal(live.size,0);assert.equal(notifications[4][1],false);
atlas.dispose();atlas.resume();assert(items.every(item=>item.canvas.width===0));assert.equal(requests.length,10);
const cancelled=Atlas.create([{file:'another',canvas:{width:160,height:160}}]);const loading=requests.at(-1),cancelledCallback=loading.onload;cancelled.dispose();cancelledCallback();assert.equal(draws,8);assert.equal(loading.value,'');
// User flow: atlas -> globe -> neighboring globe -> atlas, retaining time/place
// and clearing old image handlers and renderer frames at each transition.
const root=path.resolve(__dirname,'../app/src/main/assets'),dom=new JSDOM(fs.readFileSync(path.join(root,'index.html'),'utf8'),{url:'https://app.starlight.local/',runScripts:'outside-only'}),w=dom.window,frames=new Map();let sequence=0;
Object.defineProperty(w.document,'hidden',{value:false});w.requestAnimationFrame=fn=>{frames.set(++sequence,fn);return sequence;};w.cancelAnimationFrame=id=>frames.delete(id);w.setInterval=()=>{};
w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;};
w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}}),measureText:t=>({width:t.length*10})},{get:(o,k)=>k in o?o[k]:()=>{}});
for(const script of w.document.querySelectorAll('script[src]'))vm.runInContext(fs.readFileSync(path.join(root,script.getAttribute('src')),'utf8'),dom.getInternalVMContext());
const run=s=>vm.runInContext(s,dom.getInternalVMContext()),body=()=>w.document.getElementById('sheetBody');let latest,lastView;w.Image=class{constructor(){latest=this;}set src(v){this.value=v;}};w.SkyMoonSurface.draw=(_,__,___,view)=>lastView={...view};
const click=text=>{const b=[...body().querySelectorAll('button')].find(x=>x.textContent===text);assert(b,text);b.click();};
run('offset=3600000;showAtlas()');assert.equal(body().querySelectorAll('.planet-card').length,9);assert.equal(body().querySelectorAll('canvas').length,9);const previousImage=latest;body().querySelector('[data-body="Venus"]').click();assert.equal(previousImage.onload,null);assert.equal(previousImage.value,'');assert.equal(w.document.getElementById('sheetTitle').textContent,'金星云层');assert(run('offset===3600000'));
latest.onload();for(const [id,fn] of [...frames])if(frames.delete(id))fn(1000);
body().querySelector('.surface-globe').dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowRight'}));click('查看相位照明');for(const [id,fn] of [...frames])if(frames.delete(id))fn(1100);assert.equal(lastView.inspect,false);assert.equal(lastView.yaw,10);assert(body().querySelector('.surface-caption').textContent.includes('相位照明'));
click('切换浏览照明');for(const [id,fn] of [...frames])if(frames.delete(id))fn(1200);assert.equal(lastView.yaw,10);assert.equal(lastView.inspect,true);
body().querySelector('[aria-label="下一个天体"]').click();assert.equal(w.document.getElementById('sheetTitle').textContent,'火星地表');click('返回太阳系图鉴');assert.equal(body().querySelectorAll('.planet-card').length,9);
const canvas=body().querySelector('canvas');w.document.getElementById('close').click();w.document.getElementById('sheet').dispatchEvent(new w.Event('close'));assert.equal(canvas.width,0);assert.equal(latest.onload,null);assert.equal(latest.value,'');dom.window.close();
console.log('PASS: one active atlas map, pause/resume cancellation, failed thumbnail fallback, disposal, nine cards, lighting toggle state and neighboring-body/atlas navigation.');
