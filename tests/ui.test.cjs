// DOM-level smoke test. No actual rendering, Android sensors or browser emulation.
const {JSDOM}=require('jsdom'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../app/src/main/assets');
const dom=new JSDOM(fs.readFileSync(path.join(root,'index.html'),'utf8'),{url:'https://app.starlight.local/',runScripts:'outside-only'});
const w=dom.window;
w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({createLinearGradient:()=>({addColorStop(){}}),measureText:t=>({width:t.length*10})},{get:(o,k)=>k in o?o[k]:()=>{}});
w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;};
w.requestAnimationFrame=()=>{};w.setInterval=()=>{};
for(const f of ['astronomy.js',...fs.readdirSync(root).filter(f=>/^stars-\d+\.js$/.test(f)).sort(),'core.js','app.js'])require('node:vm').runInContext(fs.readFileSync(path.join(root,f),'utf8'),dom.getInternalVMContext());
const click=id=>w.document.getElementById(id).click(),body=()=>w.document.getElementById('sheetBody'),text=()=>body().textContent;
function clickText(t){const b=[...body().querySelectorAll('button')].find(x=>x.textContent===t);assert(b,t);b.click();}
click('search');let search=body().querySelector('input');search.value='天狼星';search.dispatchEvent(new w.Event('input'));assert(text().includes('天狼星'));clickText('查看');assert(text().includes('光年'));body().querySelector('textarea').value='测试笔记';clickText('收藏并保存笔记');click('saved');assert(text().includes('天狼星'));
click('loc');let inputs=body().querySelectorAll('input');inputs[0].value='91';inputs[1].value='0';clickText('保存位置');assert(w.document.getElementById('toast').textContent.includes('有效纬度'));inputs[0].value='-33.9';inputs[1].value='151.2';clickText('保存位置');assert(w.document.getElementById('place').textContent.includes('-33.90'));
click('later');assert.notEqual(w.document.getElementById('time').textContent,'◷ 现在');click('time');clickText('返回现在');assert.equal(w.document.getElementById('time').textContent,'◷ 现在');click('night');assert(w.document.body.classList.contains('red'));click('tonight');assert(text().includes('实际可见性'));click('help');assert(text().includes('不含相机 AR'));
click('track');assert(w.document.getElementById('toast').textContent.includes('安卓 App'));
// Validate Canvas execution and sensor callbacks in the same application scope.
require('node:vm').runInContext('render(); nativeLocation(0,0); tracking=true; nativeOrientation(359,60,0); render(); nativeUnavailable();',dom.getInternalVMContext());
assert.equal(w.document.getElementById('mode').textContent,'自由探索');
dom.window.close();console.log('PASS: search, details, persistent notes, coordinate validation, time, night mode, visible list, renderer and missing-sensor fallback.');
