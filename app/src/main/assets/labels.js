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
   const positions=[[label.x-w/2,label.y+gap],[label.x-w/2,label.y-gap-h],[label.x+gap,label.y-h/2],[label.x-gap-w,label.y-h/2]];
   for(const [left,top] of positions){
    const box={left,top,right:left+w,bottom:top+h};
    if(left<6||top<6||box.right>width-6||box.bottom>height-6||occupied.some(b=>overlaps(box,b)))continue;
    occupied.push(box);placed.push({...label,box,textX:left+w/2,textY:top+4+label.size});break;
   }
  }
  return placed;
 }
 const api={layout};root.SkyLabels=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
