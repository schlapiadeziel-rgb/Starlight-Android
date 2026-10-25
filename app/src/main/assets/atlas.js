/* Sequential, cancellable offline thumbnails. Large decoded maps and sampling
   arrays are released after each thumbnail; no additional GPU context. */
(function(root){
 'use strict';
 function create(items,notify=()=>{}){
  const queue=items.slice();let active=null,paused=false,disposed=false;
  function cancel(){
   if(!active)return;const task=active;active=null;
   task.image.onload=task.image.onerror=null;task.image.src='';root.SkyMoonSurface.release(task.image);
   return task.item;
  }
  function next(){
   if(disposed||paused||active||!queue.length)return;
   const item=queue.shift(),image=new root.Image(),task={item,image};active=task;
   function finish(ok){
    if(disposed||active!==task)return;
    active=null;image.onload=image.onerror=null;image.src='';root.SkyMoonSurface.release(image);
    notify(item,ok);next();
   }
   image.onload=()=>{
    if(disposed||active!==task)return;
    try{
     if(item.saturn)root.SkySaturn.draw(item.canvas,image,{inspect:true});
     else root.SkyMoonSurface.draw(item.canvas,image,180,{inspect:true,emissive:!!item.solar,glow:false});
     finish(true);
    }catch(e){finish(false);}
   };
   image.onerror=()=>finish(false);image.src=item.file;
  }
  next();
  return {pause(){if(disposed)return;paused=true;const item=cancel();if(item)queue.unshift(item);},
   resume(){if(disposed)return;paused=false;next();},
   dispose(){if(disposed)return;disposed=true;cancel();queue.length=0;for(const item of items)item.canvas.width=item.canvas.height=0;}};
 }
 const api={create};root.SkyAtlas=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
