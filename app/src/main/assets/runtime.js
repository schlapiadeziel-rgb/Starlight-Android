/* Demand-driven chart frames and one maintenance deadline. No idle frame loop. */
(function(root){
 'use strict';
 function create(options){
  const clock=options.now||(()=>Date.now()),frameClock=options.frameNow||(()=>root.performance.now()),
   raf=options.requestFrame||((fn)=>root.requestAnimationFrame(fn)),caf=options.cancelFrame||((id)=>root.cancelAnimationFrame(id)),
   later=options.setTimer||((fn,ms)=>root.setTimeout(fn,ms)),clear=options.clearTimer||((id)=>root.clearTimeout(id));
  let paused=true,disposed=false,frame=null,throttle=null,wake=null,lastDraw=-Infinity;
  function cancel(task,fn){if(task&&task.id!=null)fn(task.id);}
  function enqueue(){
   if(paused||disposed||frame)return;
   const task={id:null};frame=task;
   task.id=raf(()=>{if(frame!==task||paused||disposed)return;frame=null;if(frameClock()-lastDraw<(options.frameMs||32)){request();return;}lastDraw=frameClock();options.draw();});
  }
  function request(){
   if(paused||disposed||frame||throttle)return;
   // Request slightly before the budget expires; the frame callback checks
   // the actual clock. Waiting a full budget and then another vsync adds lag.
   const delay=(options.frameMs||32)-(frameClock()-lastDraw)-Math.min(16,(options.frameMs||32)/2);
   if(delay<=0){enqueue();return;}
   const task={id:null};throttle=task;
   task.id=later(()=>{if(throttle!==task||paused||disposed)return;throttle=null;enqueue();},delay);
  }
  function reschedule(){
   cancel(wake,clear);wake=null;if(paused||disposed)return;
   const due=options.deadline();if(!Number.isFinite(due))return;
   const task={id:null};wake=task;
   task.id=later(()=>{if(wake!==task||paused||disposed)return;wake=null;options.tick();reschedule();},Math.max(1,Math.min(2147483647,due-clock())));
  }
  function pause(){paused=true;cancel(frame,caf);cancel(throttle,clear);cancel(wake,clear);frame=throttle=wake=null;}
  return {request,reschedule,pause,
   resume(){if(disposed)return;const was=paused;paused=false;if(was)options.tick();reschedule();request();},
   dispose(){pause();disposed=true;}};
 }
 const api={create};root.SkyRuntime=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
