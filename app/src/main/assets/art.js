/* Three HIP anchors map artwork pixels to a normalized celestial plane.
   Artwork is rendered as small projected triangles, not a screen billboard. */
(function(root){
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
  return {points,triangles,at};
 }
 function draw(ctx,image,mesh,project,width,height){
  const projected=mesh.points.map(p=>p.v[2]>=0?project(p.v):null);
  for(const ids of mesh.triangles){
   const [a,b,c]=ids.map(i=>mesh.points[i]),q=ids.map(i=>projected[i]);if(q.some(p=>!p))continue;
   if(q.every(p=>p[0]<0)||q.every(p=>p[0]>width)||q.every(p=>p[1]<0)||q.every(p=>p[1]>height))continue;
   if(q.some(p=>Math.abs(p[0])>width*4||Math.abs(p[1])>height*4))continue;
   const dx=b.x-a.x,dy=b.y-a.y,ex=c.x-a.x,ey=c.y-a.y,det=dx*ey-dy*ex;
   const ux=q[1][0]-q[0][0],uy=q[1][1]-q[0][1],vx=q[2][0]-q[0][0],vy=q[2][1]-q[0][1];
   const A=(ux*ey-vx*dy)/det,B=(uy*ey-vy*dy)/det,C=(vx*dx-ux*ex)/det,D=(vy*dx-uy*ex)/det;
   ctx.save();ctx.beginPath();ctx.moveTo(...q[0]);ctx.lineTo(...q[1]);ctx.lineTo(...q[2]);ctx.closePath();ctx.clip();
   ctx.transform(A,B,C,D,q[0][0]-A*a.x-C*a.y,q[0][1]-B*a.x-D*a.y);ctx.drawImage(image,0,0);ctx.restore();
  }
 }
 const api={mesh,draw};root.SkyArt=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
