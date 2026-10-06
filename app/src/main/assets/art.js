/* Three HIP anchors map artwork pixels to a normalized celestial plane.
   Artwork is rendered as small projected triangles, not a screen billboard. */
(function(root){
 let surface=null;
 function mesh(data,lookup,steps=12){
  const anchors=data.anchors.map(a=>({x:a.pos[0],y:a.pos[1],v:lookup(a.hip)}));
  if(anchors.some(a=>!a.v))return null;
  const [a,b,c]=anchors,dx=b.x-a.x,dy=b.y-a.y,ex=c.x-a.x,ey=c.y-a.y,det=dx*ey-dy*ex;
  if(Math.abs(det)<1e-8)return null;
  function at(x,y){const u=((x-a.x)*ey-(y-a.y)*ex)/det,v=(dx*(y-a.y)-dy*(x-a.x))/det;
   const p=a.v.map((n,i)=>n+u*(b.v[i]-n)+v*(c.v[i]-n)),norm=Math.hypot(...p);return p.map(n=>n/norm);}
  const [w,h]=data.size,points=[];
  for(let y=0;y<=steps;y++)for(let x=0;x<=steps;x++)points.push({x:x*w/steps,y:y*h/steps,eq:at(x*w/steps,y*h/steps),v:[0,0,0]});
  const triangles=[];for(let y=0;y<steps;y++)for(let x=0;x<steps;x++){const i=y*(steps+1)+x;triangles.push([i,i+1,i+steps+1],[i+1,i+steps+2,i+steps+1]);}
  const center=at(w/2,h/2),radius=Math.max(...points.map(p=>Math.acos(Math.max(-1,Math.min(1,p.eq.reduce((n,x,i)=>n+x*center[i],0))))));
  return {points,triangles,at,size:[w,h],center:{eq:center,v:[0,0,0]},radius};
 }
 function expanded(q,pad){
  const [a,b,c]=q,ab=Math.hypot(a[0]-b[0],a[1]-b[1]),bc=Math.hypot(b[0]-c[0],b[1]-c[1]),ca=Math.hypot(c[0]-a[0],c[1]-a[1]),perimeter=ab+bc+ca;
  const area=Math.abs((b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])),radius=area/perimeter;
  if(!Number.isFinite(radius)||radius<.001)return q;
  const center=[(bc*a[0]+ca*b[0]+ab*c[0])/perimeter,(bc*a[1]+ca*b[1]+ab*c[1])/perimeter],scale=1+Math.min(.5,pad/radius);
  return q.map(p=>p.map((n,i)=>center[i]+(n-center[i])*scale));
 }
 function release(){if(surface){surface.width=surface.height=0;surface=null;}}
 function presentation(mesh,project,width,height,options={}){
  const projected=mesh.points.map(p=>p.v[2]>=0?project(p.v):null),side=Math.round(Math.sqrt(mesh.points.length));
  const density=Number.isFinite(options.density)&&options.density>0?options.density:1;
  let magnification=0,left=Infinity,top=Infinity,right=-Infinity,bottom=-Infinity;
  for(let i=0;i<projected.length;i++){
   const q=projected[i];if(!q||!q.every(Number.isFinite))continue;
   left=Math.min(left,q[0]);top=Math.min(top,q[1]);right=Math.max(right,q[0]);bottom=Math.max(bottom,q[1]);
   if(q[0]<0||q[0]>width||q[1]<0||q[1]>height)continue;
   for(const j of [i%side<side-1?i+1:-1,i+side<projected.length?i+side:-1]){
    const next=projected[j];if(j<0||!next||!next.every(Number.isFinite))continue;
    const pixels=Math.hypot(mesh.points[j].x-mesh.points[i].x,mesh.points[j].y-mesh.points[i].y);
    if(pixels>0)magnification=Math.max(magnification,density*Math.hypot(next[0]-q[0],next[1]-q[1])/pixels);
   }
  }
  // If a magnified image covers the screen between mesh samples, its full
  // projected footprint still tells us the source is being stretched.
  if(!magnification&&Number.isFinite(left))magnification=density*Math.max((right-left)/mesh.size[0],(bottom-top)/mesh.size[1]);
  const strength=Number.isFinite(options.strength)?Math.max(0,Math.min(.6,options.strength)):.3;
  const fade=1/(1+Math.max(0,magnification-1.25)*.65);
  const emphasis=options.selected?1.15*Math.max(.4,fade):.72*Math.max(.08,fade)*(options.dimmed?.3:1);
  const alpha=Number.isFinite(left)?Math.min(.65,strength*emphasis*(options.night?.45:1)):0;
  return {alpha,magnification,projected};
 }
 function draw(ctx,image,mesh,project,width,height,pixelRatio=1,view=null){
  if(width<=0||height<=0)return;
  const projected=view?view.projected:mesh.points.map(p=>p.v[2]>=0?project(p.v):null);
  const plan=[];let left=width,top=height,right=0,bottom=0;
  for(const ids of mesh.triangles){
   const [a,b,c]=ids.map(i=>mesh.points[i]),q=ids.map(i=>projected[i]);if(q.some(p=>!p))continue;
   if(q.every(p=>p[0]<0)||q.every(p=>p[0]>width)||q.every(p=>p[1]<0)||q.every(p=>p[1]>height))continue;
   if(q.some(p=>Math.abs(p[0])>width*4||Math.abs(p[1])>height*4))continue;
   const dx=b.x-a.x,dy=b.y-a.y,ex=c.x-a.x,ey=c.y-a.y,det=dx*ey-dy*ex;
   const ux=q[1][0]-q[0][0],uy=q[1][1]-q[0][1],vx=q[2][0]-q[0][0],vy=q[2][1]-q[0][1];
   const A=(ux*ey-vx*dy)/det,B=(uy*ey-vy*dy)/det,C=(vx*dx-ux*ex)/det,D=(vy*dx-uy*ex)/det;
   plan.push({q,A,B,C,D,x:q[0][0]-A*a.x-C*a.y,y:q[0][1]-B*a.x-D*a.y});
   for(const p of q){left=Math.min(left,p[0]);top=Math.min(top,p[1]);right=Math.max(right,p[0]);bottom=Math.max(bottom,p[1]);}
  }
  if(!plan.length)return;
  const ratio=Number.isFinite(pixelRatio)&&pixelRatio>0?pixelRatio:1,d=Math.min(ratio,3,Math.sqrt(6000000/(width*height)));
  let target=null;
  try{
   if(!surface)surface=document.createElement('canvas');
   const w=Math.max(1,Math.floor(width*d)),h=Math.max(1,Math.floor(height*d));
   if(surface.width!==w||surface.height!==h){surface.width=w;surface.height=h;}
   target=surface.getContext('2d');
  }catch(e){release();}
  const drawTriangle=(c,item,pad)=>{const q=pad?expanded(item.q,pad):item.q;
   c.save();c.beginPath();c.moveTo(...q[0]);c.lineTo(...q[1]);c.lineTo(...q[2]);c.closePath();c.clip();
   c.transform(item.A,item.B,item.C,item.D,item.x,item.y);c.drawImage(image,0,0,...mesh.size);c.restore();
  };
  // A simple fallback keeps the chart working if an extra canvas is unavailable.
  if(!target){release();for(const item of plan)drawTriangle(ctx,item,0);return;}
  const dx=surface.width/width,dy=surface.height/height,sx=Math.max(0,Math.floor((left-2/dx)*dx)),sy=Math.max(0,Math.floor((top-2/dy)*dy));
  const sw=Math.min(surface.width,Math.ceil((right+2/dx)*dx))-sx,sh=Math.min(surface.height,Math.ceil((bottom+2/dy)*dy))-sy;
  if(sw<=0||sh<=0)return;
  target.setTransform(1,0,0,1,0,0);target.clearRect(sx,sy,sw,sh);target.setTransform(dx,0,0,dy,0,0);
  target.globalAlpha=1;target.globalCompositeOperation='source-over';target.imageSmoothingEnabled=true;target.imageSmoothingQuality='high';
  // Opaque licensed art fills slightly overlapping clips. Apply transparency
  // once afterward, avoiding both dark cracks and bright, double-blended seams.
  for(const item of plan)drawTriangle(target,item,.75/Math.min(dx,dy));
  ctx.drawImage(surface,sx,sy,sw,sh,sx/dx,sy/dy,sw/dx,sh/dy);
 }
 function visible(mesh,b,width,height,fov){
  const focal=width/(2*Math.tan(fov*Math.PI/360)),viewRadius=Math.atan(Math.hypot(width/2,height/2)/focal);
  const dot=mesh.center.v.reduce((n,x,i)=>n+x*b.f[i],0);
  return dot>=Math.cos(Math.min(Math.PI,viewRadius+mesh.radius));
 }
 const api={mesh,draw,visible,presentation,release};root.SkyArt=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
