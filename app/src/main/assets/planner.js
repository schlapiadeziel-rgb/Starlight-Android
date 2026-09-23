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
 // An observing hint from forecast samples, not a prediction of actual sky transparency.
 function weatherHints(A,lat,lon,rows,start){
  if(!Number.isFinite(lat)||Math.abs(lat)>90||!Number.isFinite(lon)||Math.abs(lon)>180||!Number.isFinite(start)||!Array.isArray(rows))throw new Error('Invalid weather input');
  const observer=new A.Observer(lat,lon,0),out=[];
  for(const row of rows){
   if(!Array.isArray(row)||row.length!==4||!Number.isFinite(row[0])||row[0]<start||row[0]>start+86400000)continue;
   const t=new Date(row[0]),eq=A.Equator('Sun',t,observer,true,true),sun=A.Horizon(t,observer,eq.ra,eq.dec,'normal').altitude;
   const known=Number.isFinite(row[1])&&row[1]>=0&&row[1]<=100&&Number.isFinite(row[2])&&row[2]>=0&&row[2]<=100&&Number.isFinite(row[3])&&row[3]>=0;
   const dark=sun<=-12,clear=dark&&known&&row[1]<=35&&row[2]<=25&&row[3]>=5000;
   out.push({time:row[0],sun,cloud:row[1],rain:row[2],visibility:row[3],dark,clear,label:!dark?'天光较亮':!known?'天气数据不足':clear?'天气模型较有利':'天气模型不理想'});
  }
  return out;
 }
 function moonCalendar(A,start,count=8){
  if(!Number.isFinite(+start)||!Number.isInteger(count)||count<1||count>16)throw new Error('Invalid lunar calendar request');
  const labels=['新月','上弦月','满月','下弦月'];
  let event=A.SearchMoonQuarter(start);const events=[];
  for(let i=0;i<count;i++){
   events.push({quarter:event.quarter,name:labels[event.quarter],time:+event.time.date});
   event=A.NextMoonQuarter(event);
  }
  const angle=A.MoonPhase(start),fraction=A.Illumination('Moon',start).phase_fraction;
  const stage=['新月附近','娥眉月 · 渐盈','上弦附近','盈凸月 · 渐盈','满月附近','亏凸月 · 渐亏','下弦附近','残月 · 渐亏'][Math.floor((angle+22.5)/45)%8];
  return {start:+start,angle,fraction,stage,events};
 }
 root.SkyPlanner={build,moonCalendar,weatherHints};
 if(typeof module!=='undefined')module.exports=root.SkyPlanner;
})(typeof window==='undefined'?globalThis:window);
