'use strict';
/* WGS84 geodetic satellite subpoint to observer topocentric look angle. Distances in km. */
(function(root){
 const D=Math.PI/180,A=6378.137,E2=0.00669437999014;
 function ecef(lat,lon,height){const p=lat*D,l=lon*D,s=Math.sin(p),c=Math.cos(p),n=A/Math.sqrt(1-E2*s*s);return [(n+height)*c*Math.cos(l),(n+height)*c*Math.sin(l),(n*(1-E2)+height)*s];}
 function look(observerLat,observerLon,subLat,subLon,altitude){
  if(![observerLat,observerLon,subLat,subLon,altitude].every(Number.isFinite)||Math.abs(observerLat)>90||Math.abs(observerLon)>180||Math.abs(subLat)>90||Math.abs(subLon)>180||altitude<100||altitude>1000)throw new Error('Invalid ISS position');
  const observer=ecef(observerLat,observerLon,0),satellite=ecef(subLat,subLon,altitude),[dx,dy,dz]=satellite.map((v,i)=>v-observer[i]);
  const p=observerLat*D,l=observerLon*D,sp=Math.sin(p),cp=Math.cos(p),sl=Math.sin(l),cl=Math.cos(l);
  const east=-sl*dx+cl*dy,north=-sp*cl*dx-sp*sl*dy+cp*dz,up=cp*cl*dx+cp*sl*dy+sp*dz;
  return {az:(Math.atan2(east,north)/D+360)%360,alt:Math.atan2(up,Math.hypot(east,north))/D,range:Math.hypot(dx,dy,dz)};
 }
 const api={look};root.SkyISS=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
