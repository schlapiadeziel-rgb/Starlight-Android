/* Geometry for browsing a photograph; this never changes sky coordinates. */
(function(root){
 function create(imageWidth,imageHeight,width,height){
  if(![imageWidth,imageHeight,width,height].every(v=>Number.isFinite(v)&&v>0))return null;
  const view={zoom:1,x:0,y:0,width,height};
  let fit=Math.min(width/imageWidth,height/imageHeight);
  const clamp=()=>{const maxX=Math.max(0,(imageWidth*fit*view.zoom-view.width)/2),maxY=Math.max(0,(imageHeight*fit*view.zoom-view.height)/2);view.x=Math.max(-maxX,Math.min(maxX,view.x));view.y=Math.max(-maxY,Math.min(maxY,view.y));};
  const scale=value=>Math.max(1,Math.min(4,Number.isFinite(value)?value:view.zoom));
  view.layout=()=>{const w=imageWidth*fit*view.zoom,h=imageHeight*fit*view.zoom;return {left:(view.width-w)/2+view.x,top:(view.height-h)/2+view.y,width:w,height:h};};
  view.pan=(dx,dy)=>{if(!Number.isFinite(dx)||!Number.isFinite(dy))return;view.x+=dx;view.y+=dy;clamp();};
  view.zoomTo=(value,anchorX=view.width/2,anchorY=view.height/2)=>{
   if(!Number.isFinite(anchorX)||!Number.isFinite(anchorY))return;
   const next=scale(value),ratio=next/view.zoom;
   view.x=anchorX-view.width/2-(anchorX-view.width/2-view.x)*ratio;
   view.y=anchorY-view.height/2-(anchorY-view.height/2-view.y)*ratio;
   view.zoom=next;clamp();
  };
  view.gesture=(before,after)=>{
   if(!before||!after||![before.x,before.y,before.distance,after.x,after.y,after.distance].every(Number.isFinite)||before.distance<=0||after.distance<=0)return;
   const next=scale(view.zoom*after.distance/before.distance),ratio=next/view.zoom;
   view.x=after.x-view.width/2-(before.x-view.width/2-view.x)*ratio;
   view.y=after.y-view.height/2-(before.y-view.height/2-view.y)*ratio;
   view.zoom=next;clamp();
  };
  view.resize=(w,h)=>{if(![w,h].every(v=>Number.isFinite(v)&&v>0))return;const nextFit=Math.min(w/imageWidth,h/imageHeight);view.x*=nextFit/fit;view.y*=nextFit/fit;fit=nextFit;view.width=w;view.height=h;clamp();};
  view.reset=()=>{view.zoom=1;view.x=view.y=0;};
  return view;
 }
 const api={create};root.SkyPhotoView=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
