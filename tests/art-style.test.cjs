const assert=require('node:assert/strict'),{createCanvas}=require('@napi-rs/canvas'),Art=require('../app/src/main/assets/art.js');
global.document={createElement:()=>createCanvas(1,1)};
const unit=v=>{const n=Math.hypot(...v);return v.map(x=>x/n);};
const data={size:[100,100],anchors:[{pos:[0,0],hip:1},{pos:[100,0],hip:2},{pos:[0,100],hip:3}]};
const anchors=new Map([[1,unit([-1,-1,1])],[2,unit([1,-1,1])],[3,unit([-1,1,1])]]),mesh=Art.mesh(data,id=>anchors.get(id));
for(const p of mesh.points)p.v=p.eq;
const projection=scale=>v=>[200+scale*v[0]/v[2],200+scale*v[1]/v[2]];
const style=(scale,extra={})=>Art.presentation(mesh,projection(scale),400,400,{strength:.3,density:1,...extra});
const fitted=style(40),zoomed=style(600),selected=style(600,{selected:true}),dimmed=style(600,{dimmed:true});
assert(zoomed.magnification>fitted.magnification);assert(zoomed.alpha<fitted.alpha/2,'large stretched art must retreat behind stars');
assert(selected.alpha>zoomed.alpha,'selected constellation remains readable');assert(dimmed.alpha<zoomed.alpha,'other constellations dim around a target');
assert(style(40,{density:3}).alpha<fitted.alpha,'physical pixel density is included');
assert(style(40,{night:true}).alpha<fitted.alpha,'red night mode further dims artwork');
assert.equal(style(40,{strength:0}).alpha,0);
for(const strength of [-100,.3,100,NaN,Infinity])for(const density of [.5,1,3,NaN]){
 const value=style(600,{strength,density,selected:true});assert(Number.isFinite(value.alpha)&&value.alpha>=0&&value.alpha<=.65);
}
const below={...mesh,points:mesh.points.map(p=>({...p,v:[p.v[0],p.v[1],-1]}))};
assert.equal(Art.presentation(below,projection(40),400,400).alpha,0);
const white=createCanvas(100,100);white.getContext('2d').fillStyle='white';white.getContext('2d').fillRect(0,0,100,100);
function raster(alpha,view){
 const out=createCanvas(400,400),ctx=out.getContext('2d');ctx.fillStyle='black';ctx.fillRect(0,0,400,400);ctx.globalCompositeOperation='screen';ctx.globalAlpha=alpha;
 Art.draw(ctx,white,mesh,view?()=>{throw Error('projection should be reused');}:projection(600),400,400,1,view);
 const background=ctx.getImageData(200,200,1,1).data[0];
 ctx.globalAlpha=1;ctx.fillStyle='white';ctx.fillRect(199,199,3,3);
 return {background,star:ctx.getImageData(200,200,1,1).data[0]};
}
const old=raster(.3),current=raster(zoomed.alpha,zoomed);
assert(current.background<old.background/2,'rasterized source loses its large bright wash');assert.equal(current.star,old.star,'foreground star brightness is preserved');
Art.release();
console.log('PASS: density-aware artwork fade, target emphasis, night/strength bounds, horizon hiding, reused projection and actual background/star contrast.');
