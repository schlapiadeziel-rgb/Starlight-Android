const assert=require('node:assert/strict');
const {create}=require('../app/src/main/assets/photo-view.js');
const near=(a,b)=>assert(Math.abs(a-b)<1e-8,`${a} != ${b}`);
const point=(v,x,y)=>{const r=v.layout();return [(x-r.left)/r.width,(y-r.top)/r.height];};
const tall=create(800,1875,400,300);
near(tall.layout().height,300);assert(tall.layout().width<400);
tall.pan(500,500);near(tall.x,0);near(tall.y,0);
const view=create(1000,1000,400,400);
view.zoomTo(2);const anchor=point(view,280,210);
view.zoomTo(2.8,280,210);const same=point(view,280,210);near(anchor[0],same[0]);near(anchor[1],same[1]);
const pinchAnchor=point(view,220,190);
view.gesture({x:220,y:190,distance:100},{x:245,y:205,distance:110});const moved=point(view,245,205);near(pinchAnchor[0],moved[0]);near(pinchAnchor[1],moved[1]);
const center=point(view,200,200);view.resize(640,320);const resized=point(view,320,160);near(center[0],resized[0]);near(center[1],resized[1]);
view.zoomTo(200);assert.equal(view.zoom,4);view.zoomTo(.01);assert.equal(view.zoom,1);near(view.x,0);near(view.y,0);
// Dragging even far past the edge must leave no avoidable empty band.
for(const [iw,ih,w,h] of [[960,715,400,300],[800,1875,360,500],[960,960,580,260]]){
 const p=create(iw,ih,w,h);p.zoomTo(4);
 for(const [dx,dy] of [[10000,-10000],[-20000,20000],[800,900]]){
  p.pan(dx,dy);const r=p.layout();
  if(r.width>=w){assert(r.left<=1e-8);assert(r.left+r.width>=w-1e-8);}else near(r.left,(w-r.width)/2);
  if(r.height>=h){assert(r.top<=1e-8);assert(r.top+r.height>=h-1e-8);}else near(r.top,(h-r.height)/2);
 }
 p.reset();assert.equal(p.zoom,1);near(p.x,0);near(p.y,0);
}
assert.equal(create(0,100,400,300),null);assert.equal(create(100,NaN,400,300),null);
const before=JSON.stringify(view.layout());view.pan(Infinity,0);view.resize(0,300);view.gesture({x:0,y:0,distance:0},{x:1,y:1,distance:1});assert.equal(JSON.stringify(view.layout()),before);
console.log('PASS: photo viewer keeps pinch and wheel anchors, bounds panning, fits tall images and preserves center on resize.');
