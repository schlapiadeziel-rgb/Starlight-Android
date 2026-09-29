const assert=require('node:assert/strict'),{createCanvas}=require('@napi-rs/canvas'),Photo=require('../app/src/main/assets/deep-photo.js');
global.document={createElement(){return createCanvas(1,1);}};
// Fine source detail should survive a high-density preview more faithfully
// than the old 320-pixel cache. Compare against rendering the full source.
const source=createCanvas(800,800),ctx=source.getContext('2d');ctx.fillStyle='black';ctx.fillRect(0,0,800,800);ctx.fillStyle='white';
for(let x=0;x<800;x+=8)ctx.fillRect(x,0,4,800);source.naturalWidth=800;source.naturalHeight=800;
function pixels(need){const out=createCanvas(510,510),c=out.getContext('2d');c.imageSmoothingQuality='high';c.drawImage(Photo.sprite(source,need),0,0,510,510);return c.getImageData(0,0,510,510).data;}
const low=pixels(320),high=pixels(510),reference=pixels(800);let lowError=0,highError=0;
for(let y=180;y<330;y++)for(let x=180;x<330;x++){const i=(y*510+x)*4;lowError+=(low[i]-reference[i])**2;highError+=(high[i]-reference[i])**2;}
assert(highError<lowError*.75,'higher-resolution previews must retain more fine detail');
console.log('PASS: high-density photo rendering retains fine source detail closer to full-source rendering.');
