const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'../app/src/main/assets'),dom=new JSDOM(fs.readFileSync(path.join(root,'index.html'),'utf8'),{url:'https://app.starlight.local/',runScripts:'outside-only'}),w=dom.window;
let elapsed=0,sequence=0,requests=0;const start=Date.parse('2026-10-24T12:00:47Z'),jobs=new Map(),errors=[];
Object.defineProperty(w.document,'hidden',{value:false});w.Date.now=()=>start+elapsed;Object.defineProperty(w.performance,'now',{value:()=>elapsed});
w.setTimeout=(fn,ms)=>{jobs.set(++sequence,{at:elapsed+ms,fn,kind:'timer'});return sequence;};w.clearTimeout=id=>jobs.delete(id);w.setInterval=()=>{throw Error('Unexpected interval');};
w.requestAnimationFrame=fn=>{jobs.set(++sequence,{at:elapsed+16,fn,kind:'frame'});return sequence;};w.cancelAnimationFrame=id=>jobs.delete(id);
w.addEventListener('error',e=>errors.push(e.error));w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new w.Event('close'));};
w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}}),measureText:t=>({width:t.length*10})},{get:(o,k)=>k in o?o[k]:()=>{}});
function advance(ms){const end=elapsed+ms;let n=0;while(true){const next=[...jobs].sort((a,b)=>a[1].at-b[1].at)[0];if(!next||next[1].at>end)break;assert(n++<10000,'No busy loop');jobs.delete(next[0]);elapsed=next[1].at;next[1].fn();}elapsed=end;}
for(const s of w.document.querySelectorAll('script[src]'))vm.runInContext(fs.readFileSync(path.join(root,s.getAttribute('src')),'utf8'),dom.getInternalVMContext());
assert.equal(vm.runInContext("Object.values(skyTextures).filter(image=>image.hasAttribute('src')).length",dom.getInternalVMContext()),0,'No sky textures load before the first view is drawn');
const run=code=>vm.runInContext(code,dom.getInternalVMContext());run('cfg.galaxy=false;cfg.art=false;window.draws=0;window.originalRender=render;render=()=>{draws++;originalRender();}');advance(1000);assert.equal(w.draws,1);assert(![...jobs.values()].some(j=>j.kind==='frame'));
run("loadSkyTexture('Moon');loadSkyTexture('Moon')");assert(run("moonMap.src.endsWith('/textures/moon.jpg')"));
run('moonMap.onload()');advance(32);assert.equal(w.draws,2,'A loaded visible texture redraws the sky once');
const initial=w.document.getElementById('clock').textContent;advance(12000);assert.notEqual(w.document.getElementById('clock').textContent,initial,'Clock updates at minute boundary without waiting for 30s calculation');assert.equal(w.draws,2);
run("deepPhoto('M31',100);window.latePhotoLoad=deepPhotoImages.get('M31').onload");assert.equal(run('deepPhotoImages.size'),1);
run('nativeAppPaused()');const before=w.draws;assert.equal(jobs.size,0);assert.equal(run("moonMap.hasAttribute('src')"),false,'Background pause drops sky image references');assert.equal(run('deepPhotoImages.size'),0,'Background pause clears deep-sky images');run('invalidateSky()');advance(600000);assert.equal(w.draws,before);run('nativeAppResumed()');assert.equal(run('lastCalc'),start+elapsed);advance(16);assert.equal(w.draws,before+1);
run('latePhotoLoad()');advance(50);assert.equal(w.draws,before+1,'Late deep-sky callback cannot restart the chart');
w.NativeSky={fetchIss:()=>requests++,setCoordinates(){},track(){}};run("cfg.place='测试地点';offset=0;showIss()");assert.equal(requests,1);
function result(){run('nativeIssResult('+JSON.stringify(JSON.stringify({timestamp:start+elapsed,latitude:run('cfg.lat'),longitude:run('cfg.lon'),altitude:400}))+')');}
result();advance(7999);assert.equal(requests,1);advance(1);assert.equal(requests,2);result();run('focus(issSnapshot)');assert.equal(run('selected.id'),'ISS');advance(12000);assert.equal(run('issSnapshot'),null);assert.equal(run('selected'),null);advance(16000);assert.equal(requests,2,'Closing ISS sheet stops refresh requests');
run("cfg.place='北京 · 示例位置';showIss()");advance(24000);assert.equal(requests,2,'Sample coordinates must not start ISS networking');
const version=fs.readFileSync(path.resolve(__dirname,'../app/build.gradle'),'utf8').match(/versionName '([^']+)'/)[1];run("$('help').click()");assert(w.document.getElementById('sheetBody').textContent.includes('STARLIGHT '+version+' /'));run('nativeAppPaused()');assert.equal(jobs.size,0);assert.deepEqual(errors,[]);dom.window.close();
console.log('PASS: real app idles without frames/intervals, minute clock, background cancellation, stale-sky refresh on resume, 8s ISS refresh, 12s expiry and closed/sample-location network gating.');
