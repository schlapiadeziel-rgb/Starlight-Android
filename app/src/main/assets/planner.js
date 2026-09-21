'use strict';
// All times are instants; only the UI formats them in the device time zone.
(function(root){
 const STEP=10*60*1000;
 function windows(samples,predicate){
  const result=[];let start=null;
  for(let i=0;i<samples.length-1;i++){
   // Midpoint samples represent ten-minute intervals, not exact rise/set events.
   if(predicate(samples[i])){if(start===null)start=samples[i].time-STEP/2;}
   else if(start!==null){result.push({start,end:samples[i].time-STEP/2});start=null;}
  }
  if(start!==null)result.push({start,end:samples[samples.length-1].time-STEP/2});
  return result;
 }
 function build(A,lat,lon,start){
  if(!Number.isFinite(lat)||Math.abs(lat)>90||!Number.isFinite(lon)||Math.abs(lon)>180||!Number.isFinite(+start))throw new Error('Invalid observer or date');
  const obs=new A.Observer(lat,lon,0),ids=['Moon','Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune'],samples=[];
  function altitude(id,t){const eq=A.Equator(id,t,obs,true,true);return A.Horizon(t,obs,eq.ra,eq.dec,'normal').altitude;}
  for(let i=0;i<=144;i++){
   const time=+start+(i+.5)*STEP,t=new Date(time),sun=altitude('Sun',t),heights={};
   for(const id of ids)heights[id]=altitude(id,t);
   samples.push({time,sun,heights});
  }
  const targets=ids.map(id=>{
   const slots=windows(samples,s=>s.sun<=-6&&s.heights[id]>=20);
   const usable=samples.slice(0,-1).filter(s=>s.sun<=-6&&s.heights[id]>=20);
   const best=usable.reduce((best,s)=>!best||s.heights[id]>best.heights[id]?s:best,null);
   return {id,windows:slots,best:best?{time:best.time,alt:best.heights[id]}:null};
  });
  return {start:+start,end:+start+86400000,dark:windows(samples,s=>s.sun<=-18),moonFraction:A.Illumination('Moon',start).phase_fraction,targets};
 }
 root.SkyPlanner={build};
 if(typeof module!=='undefined')module.exports=root.SkyPlanner;
})(typeof window==='undefined'?globalThis:window);
