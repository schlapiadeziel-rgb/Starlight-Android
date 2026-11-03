/* Screen-space labels only. Object projection and picking remain independent. */
(function(root){
 'use strict';
 const overlaps=(a,b)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
 function layout(candidates,width,height,obstacles=[],markers=[]){
  if(!(width>0&&height>0))return [];
  const occupied=[...obstacles,...markers],placed=[],seen=new Set();
  const ordered=candidates.map((label,index)=>({label,index})).sort((a,b)=>b.label.priority-a.label.priority||a.index-b.index);
  for(const {label} of ordered){
   if(seen.has(label.id))continue;
   seen.add(label.id);
   if(![label.x,label.y,label.width,label.size,label.radius].every(Number.isFinite)||label.width<=0||label.size<=0)continue;
   const w=label.width+8,h=label.size+8,gap=Math.max(0,label.radius)+6;
   // Keep a label close to its symbol; do not move it across the sky to find space.
   if(label.inline){
    for(const anchor of label.alternatives||[label]){
     if(![anchor.x,anchor.y,anchor.angle].every(Number.isFinite))continue;
     const c=Math.abs(Math.cos(anchor.angle)),s=Math.abs(Math.sin(anchor.angle)),halfW=(w*c+h*s)/2,halfH=(w*s+h*c)/2;
     const box={left:anchor.x-halfW,top:anchor.y-halfH,right:anchor.x+halfW,bottom:anchor.y+halfH};
     if(box.left<6||box.top<6||box.right>width-6||box.bottom>height-6||occupied.some(b=>overlaps(box,b)))continue;
     occupied.push(box);placed.push({...label,box,textX:anchor.x,textY:anchor.y,angle:anchor.angle});break;
    }
    continue;
   }
   const positions=[[label.x-w/2,label.y+gap],[label.x-w/2,label.y-gap-h],[label.x+gap,label.y-h/2],[label.x-gap-w,label.y-h/2]];
   for(const [left,top] of positions){
    const box={left,top,right:left+w,bottom:top+h};
    if(left<6||top<6||box.right>width-6||box.bottom>height-6||occupied.some(b=>overlaps(box,b)))continue;
    occupied.push(box);placed.push({...label,box,textX:left+w/2,textY:top+4+label.size});break;
   }
  }
  return placed;
 }
 // Wide fields keep only the brightest names; zooming reveals the next tier.
 function starMagnitudeLimit(fov){
  if(!Number.isFinite(fov)||fov<=0)return 1.7;
  if(fov>82)return .8;if(fov>60)return 1.2;if(fov>40)return 1.7;if(fov>24)return 2.15;return 2.6;
 }
 function showStarName(magnitude,fov,selected){return !!selected||Number.isFinite(magnitude)&&magnitude<starMagnitudeLimit(fov);}
 function showConstellationName(points,fov){
  if(!Number.isFinite(points)||!Number.isFinite(fov))return false;
  return points>=(fov>82?14:fov>60?8:fov>40?5:3);
 }
 function showDeepSkyName(fov,selected){return !!selected||Number.isFinite(fov)&&fov<=52;}
 const api={layout,starMagnitudeLimit,showStarName,showConstellationName,showDeepSkyName};root.SkyLabels=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
