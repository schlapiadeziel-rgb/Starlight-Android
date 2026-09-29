// Actual raster checks catch seams that projection/command mocks cannot see.
const assert=require('node:assert/strict'),{createCanvas}=require('@napi-rs/canvas'),Art=require('../app/src/main/assets/art.js');
const buffers=[];global.document={createElement(){const c=createCanvas(1,1);buffers.push(c);return c;}};
const unit=v=>{const n=Math.hypot(...v);return v.map(x=>x/n);};
const data={size:[100,100],anchors:[{pos:[0,0],hip:1},{pos:[100,0],hip:2},{pos:[0,100],hip:3}]};
const anchors=new Map([[1,unit([-1,-1,1])],[2,unit([1,-1,1])],[3,unit([-1,1,1])]]),mesh=Art.mesh(data,id=>anchors.get(id));
for(const p of mesh.points)p.v=p.eq;
const white=createCanvas(100,100),black=createCanvas(100,100);white.getContext('2d').fillStyle='white';white.getContext('2d').fillRect(0,0,100,100);
black.getContext('2d').fillStyle='black';black.getContext('2d').fillRect(0,0,100,100);
const projection=(w,h,tilt)=>v=>{const x=v[0]/v[2],y=v[1]/v[2],z=1+tilt*x+.07*tilt*y;return [w/2+40*(x+.2*tilt*y)/z,h/2+40*(y-.2*tilt*x)/z];};
for(const ratio of [1,2,3])for(const alpha of [.3,.6,.9])for(const tilt of [0,.25]){
 const w=160,h=190,out=createCanvas(w*ratio,h*ratio),ctx=out.getContext('2d');
 ctx.fillStyle='black';ctx.fillRect(0,0,out.width,out.height);ctx.setTransform(ratio,0,0,ratio,0,0);ctx.globalCompositeOperation='screen';ctx.globalAlpha=alpha;
 Art.draw(ctx,white,mesh,projection(w,h,tilt),w,h,ratio);
 const pixels=ctx.getImageData(0,0,out.width,out.height).data,expected=Math.round(255*alpha);
 for(let y=(h/2-20)*ratio;y<(h/2+20)*ratio;y++)for(let x=(w/2-20)*ratio;x<(w/2+20)*ratio;x++){
  const value=pixels[(y*out.width+x)*4];assert(Math.abs(value-expected)<=2,'dark or bright seam at '+ratio+'x / '+alpha+' / '+tilt+': '+value);
 }
 assert.equal(pixels[0],0,'art should not leak outside its bounds');
 // Reusing the buffer for dark art must not retain a previous bright figure.
 ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.fillStyle='black';ctx.fillRect(0,0,w,h);ctx.globalCompositeOperation='screen';
 Art.draw(ctx,black,mesh,projection(w,h,tilt),w,h,ratio);
 assert.equal(ctx.getImageData(w/2*ratio,h/2*ratio,1,1).data[0],0,'stale buffer pixels');
}
assert.equal(buffers.length,1,'one shared buffer across frames and images');
const out=createCanvas(160,190),ctx=out.getContext('2d');
// Partly off-screen artwork is clipped normally; fully hidden art does no work.
Art.draw(ctx,white,mesh,v=>[-10+40*v[0]/v[2],95+40*v[1]/v[2]],160,190,1);
assert(ctx.getImageData(5,95,1,1).data[0]>240);assert.equal(ctx.getImageData(140,95,1,1).data[3],0);
const hidden={...mesh,points:mesh.points.map(p=>({...p,v:[p.v[0],p.v[1],-1]}))};
ctx.clearRect(0,0,160,190);Art.draw(ctx,white,hidden,projection(160,190,0),160,190,1);assert.equal(ctx.getImageData(80,95,1,1).data[3],0);
// Even a very large viewport keeps the extra buffer within six million pixels.
Art.draw(ctx,white,mesh,projection(2000,2000,0),2000,2000,3);assert(buffers[0].width*buffers[0].height<=6000000);
Art.release();Art.draw(ctx,white,mesh,projection(160,190,0),160,190,1);assert.equal(buffers.length,2,'release should discard the shared buffer');
Art.release();global.document={createElement(){return {width:0,height:0,getContext(){return null;}}}};
assert.doesNotThrow(()=>Art.draw(ctx,white,mesh,projection(160,190,0),160,190,1),'fallback for an unavailable extra canvas');
console.log('PASS: rasterized art has no dark or bright interior seams at 1x/2x/3x, one reusable bounded buffer, clipping, release and fallback.');
