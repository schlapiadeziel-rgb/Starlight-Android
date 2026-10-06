/* J2000 equatorial grid. Coordinates share the catalog's horizon rotation. */
(function(root){
 'use strict';
 const D=Math.PI/180;
 function point(ra,dec){const a=ra*15*D,d=dec*D;return {eq:[Math.cos(d)*Math.cos(a),Math.cos(d)*Math.sin(a),Math.sin(d)],v:[0,0,0]};}
 function hours(h){const whole=Math.floor(h),minutes=Math.round((h-whole)*60);return whole+'h'+(minutes?String(minutes).padStart(2,'0')+'m':'');}
 function geometry(hourStep,degreeStep){
  const lines=[];
  for(let h=0;h<24;h+=hourStep){const points=[];for(let d=-90;d<=90;d+=2)points.push(point(h,d));lines.push({id:'ra'+h,name:hours(h),equator:false,points});}
  const bound=Math.floor(89/degreeStep)*degreeStep;
  for(let d=-bound;d<=bound;d+=degreeStep){const points=[];for(let a=0;a<=24;a+=.2)points.push(point(a,d));points.push(point(24,d));lines.push({id:'dec'+d,name:(d>0?'+':'')+d+'°',equator:d===0,points});}
  return lines;
 }
 function create(){
  let key='',lines=[],lastRotation=null;
  return {get(fov,basis,rotation){
   const north=[-rotation[2][1],rotation[2][0],rotation[2][2]],s=Math.abs(north.reduce((n,v,i)=>n+v*basis.f[i],0));
   let hourStep=fov<=25?.5:fov<=65?1:2;
   if(s>Math.sin(80*D))hourStep=6;else if(s>Math.sin(65*D))hourStep=Math.max(hourStep,3);
   const degreeStep=fov<=25?5:fov<=65?10:20,next=hourStep+':'+degreeStep;
   if(next!==key){key=next;lines=geometry(hourStep,degreeStep);lastRotation=null;}
   if(lastRotation!==rotation){for(const line of lines)for(const p of line.points){const [x,y,z]=p.eq;
    p.v[0]=-(rotation[0][1]*x+rotation[1][1]*y+rotation[2][1]*z);
    p.v[1]=rotation[0][0]*x+rotation[1][0]*y+rotation[2][0]*z;
    p.v[2]=rotation[0][2]*x+rotation[1][2]*y+rotation[2][2]*z;
   }lastRotation=rotation;}
   return lines;
  }};
 }
 // Clip each visible segment before drawing or choosing on-line label positions.
 function clip(a,b,width,height){
  if(!a||!b||![...a,...b].every(Number.isFinite))return null;
  const dx=b[0]-a[0],dy=b[1]-a[1];let lo=0,hi=1;
  for(const [p,q] of [[-dx,a[0]-8],[dx,width-8-a[0]],[-dy,a[1]-8],[dy,height-8-a[1]]]){
   if(Math.abs(p)<1e-12){if(q<0)return null;continue;}
   const t=q/p;if(p<0)lo=Math.max(lo,t);else hi=Math.min(hi,t);if(lo>hi)return null;
  }
  if(Math.hypot(dx,dy)*(hi-lo)<.01)return null;
  return [a[0]+lo*dx,a[1]+lo*dy,a[0]+hi*dx,a[1]+hi*dy];
 }
 function project(lines,projection,width,height){
  const visible=[];
  for(const line of lines){const segments=[];let prev=null,length=0;
   for(const point of line.points){const q=projection(point.v),segment=clip(prev,q,width,height);prev=q;if(!segment)continue;
    const n=Math.hypot(segment[2]-segment[0],segment[3]-segment[1]);segments.push({p:segment,n});length+=n;
   }
   if(!segments.length)continue;
   const alternatives=[];
   if(length>=75)for(const fraction of [.5,.3,.7,.15,.85]){let distance=length*fraction;
    for(const segment of segments){if(distance>segment.n){distance-=segment.n;continue;}
     const [x,y,endX,endY]=segment.p,t=distance/segment.n;let angle=Math.atan2(endY-y,endX-x);
     if(angle>Math.PI/2)angle-=Math.PI;if(angle<-Math.PI/2)angle+=Math.PI;
     alternatives.push({x:x+(endX-x)*t,y:y+(endY-y)*t,angle});break;
    }
   }
   visible.push({...line,segments:segments.map(s=>s.p),alternatives});
  }
  return visible;
 }
 const api={create,project,clip,hours};root.SkyGrid=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
