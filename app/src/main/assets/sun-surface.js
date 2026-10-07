/* Original, deterministic solar-limb artwork. Not an observation or activity model. */
(function(root){
 'use strict';
 const D=Math.PI/180,clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
 const loops=[];let seed=390329;
 function random(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
 for(let i=0;i<60;i++){
  const lat=Math.asin(2*(i+.5)/60-1),lon=i*2.399963229728653;
  const c=Math.cos(lat),s=Math.sin(lat),sn=Math.sin(lon),cs=Math.cos(lon),tilt=random()*Math.PI;
  loops.push({anchor:[c*sn,s,c*cs],tangent:[cs*Math.cos(tilt)-s*sn*Math.sin(tilt),c*Math.sin(tilt),-sn*Math.cos(tilt)-s*cs*Math.sin(tilt)],
   height:.045+Math.pow(random(),2)*.16,span:.035+random()*.075,phase:random()*Math.PI*2,speed:.22+random()*.3,alpha:.3+random()*.3});
 }
 function pose(view={}){
  const yaw=(Number.isFinite(view.yaw)?view.yaw:0)*D,pitch=clamp(Number.isFinite(view.pitch)?view.pitch:0,-85,85)*D;
  return {cy:Math.cos(yaw),sy:Math.sin(yaw),cp:Math.cos(pitch),sp:Math.sin(pitch),zoom:clamp(Number.isFinite(view.zoom)?view.zoom:1,1,4)};
 }
 function project(v,p){const x=v[0]*p.cy-v[2]*p.sy,z=v[0]*p.sy+v[2]*p.cy;return [x,-(v[1]*p.cp-z*p.sp),v[1]*p.sp+z*p.cp];}
 function geometry(view={},seconds=0){
  const p=pose(view),t=Number.isFinite(seconds)?Math.max(0,seconds):0,paths=[];
  for(const loop of loops)for(let strand=0;strand<3;strand++){
   const points=[],wave=Math.sin(t*loop.speed+loop.phase),height=loop.height*(1+.13*wave)*(1-strand*.075);
   for(let j=0;j<=20;j++){
    const u=j/20,arch=Math.sin(Math.PI*u),offset=loop.span*(2*u-1)+strand*.002*arch;
    const direction=loop.anchor.map((v,i)=>v+loop.tangent[i]*offset),norm=Math.hypot(...direction);
    const radius=.996+height*arch+arch*.0025*Math.sin(u*16+t*.7+loop.phase+strand);
    points.push(project(direction.map(v=>v*radius/norm),p));
   }
   // The opaque sphere masks these paths; the far side cannot protrude through its face.
   paths.push({points,alpha:loop.alpha*(.9+.1*Math.sin(t*.6+loop.phase)),strand});
  }
  return {paths,zoom:p.zoom};
 }
 function create(image,surface){
  let base=null,key=null,disposed=false;
  function release(){if(base){base.width=base.height=0;base=null;}key=null;}
  function draw(target,view={},seconds=0){
   if(disposed||!target.width||!target.height)return false;
   const p=pose(view),size=target.width,next=[size,p.zoom,view.yaw||0,view.pitch||0].join('/');
   if(next!==key){
    if(!base)base=document.createElement('canvas');base.width=base.height=size;
    surface.draw(base,image,180,{...view,emissive:true,glow:false});key=next;
   }
   const ctx=target.getContext('2d'),m=size/2,r=size*.4*p.zoom;
   ctx.clearRect(0,0,target.width,target.height);ctx.save();
   try{
    if(view.glow!==false&&p.zoom<1.8){
     const halo=ctx.createRadialGradient(m,m,r*.98,m,m,r*1.25);
     halo.addColorStop(0,'#ffc363b0');halo.addColorStop(.12,'#ff98175a');halo.addColorStop(.45,'#ed551522');halo.addColorStop(1,'#b92b0000');
     ctx.fillStyle=halo;ctx.fillRect(0,0,size,size);
     ctx.globalCompositeOperation='lighter';ctx.lineCap='round';ctx.lineJoin='round';
     for(const path of geometry(view,seconds).paths){
      // Reject fully hidden loops before creating a path; fixed sample/strand limits bound work.
      if(!path.points.some(q=>Math.hypot(q[0],q[1])>.995))continue;
      ctx.beginPath();for(let i=0;i<path.points.length;i++){const q=path.points[i],x=m+q[0]*r,y=m+q[1]*r;if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y);}
      if(path.strand===0){ctx.globalAlpha=path.alpha*.4;ctx.strokeStyle='#f44314';ctx.lineWidth=r*.018;ctx.stroke();ctx.globalAlpha=path.alpha*.6;ctx.strokeStyle='#ff761e';ctx.lineWidth=r*.008;ctx.stroke();}
      ctx.globalAlpha=path.alpha*.42;ctx.strokeStyle=path.strand===1?'#ffc987':'#ff9a38';ctx.lineWidth=Math.max(.6,r*(path.strand===1?.003:.004));ctx.stroke();
     }
    }
    ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;ctx.drawImage(base,0,0);
   }finally{ctx.restore();}
   return true;
  }
  return {draw,release,dispose(){release();disposed=true;}};
 }
 // Only the light overlay changes on a tick. Surface projection is cached by view and size.
 function motion(draw,options={}){
  const request=options.requestFrame||root.requestAnimationFrame.bind(root),cancel=options.cancelFrame||root.cancelAnimationFrame.bind(root);
  let running=false,disposed=false,frame=null,last=null,painted=null,time=0;
  function tick(t){
   frame=null;if(!running||disposed)return;
   if(last!==null)time+=clamp((t-last)/1000,0,.1);last=t;
   if(painted===null||t-painted>=1000/30-.5){painted=t;draw(time);}
   if(running&&!disposed)frame=request(tick);
  }
  function stop(){running=false;if(frame!==null)cancel(frame);frame=null;last=painted=null;}
  return {start(){if(running||disposed)return;running=true;last=painted=null;frame=request(tick);},stop,
   dispose(){stop();disposed=true;},get time(){return time;},get active(){return running;}};
 }
 const api={geometry,create,motion};root.SkySunSurface=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
