/* Adaptive display smoothing of the already fused Android orientation.
   Quaternion interpolation avoids north-wrap and zenith Euler singularities. */
(function(root){
 function quaternion(b){
  const m=[b.r[0],b.u[0],-b.f[0],b.r[1],b.u[1],-b.f[1],b.r[2],b.u[2],-b.f[2]];
  let x,y,z,w,t=m[0]+m[4]+m[8],s;
  if(t>0){s=Math.sqrt(t+1)*2;w=s/4;x=(m[7]-m[5])/s;y=(m[2]-m[6])/s;z=(m[3]-m[1])/s;}
  else if(m[0]>m[4]&&m[0]>m[8]){s=Math.sqrt(1+m[0]-m[4]-m[8])*2;w=(m[7]-m[5])/s;x=s/4;y=(m[1]+m[3])/s;z=(m[2]+m[6])/s;}
  else if(m[4]>m[8]){s=Math.sqrt(1+m[4]-m[0]-m[8])*2;w=(m[2]-m[6])/s;x=(m[1]+m[3])/s;y=s/4;z=(m[5]+m[7])/s;}
  else{s=Math.sqrt(1+m[8]-m[0]-m[4])*2;w=(m[3]-m[1])/s;x=(m[2]+m[6])/s;y=(m[5]+m[7])/s;z=s/4;}
  const n=Math.hypot(x,y,z,w);return [x/n,y/n,z/n,w/n];
 }
 function basis(q){
  const [x,y,z,w]=q;
  return {r:[1-2*(y*y+z*z),2*(x*y+z*w),2*(x*z-y*w)],
   u:[2*(x*y-z*w),1-2*(x*x+z*z),2*(y*z+x*w)],
   f:[-2*(x*z+y*w),-2*(y*z-x*w),-(1-2*(x*x+y*y))]};
 }
 function create(){
  let previous=null,last=0;
  return {reset(){previous=null;last=0;},update(view,time){
   if(!Number.isFinite(time)||!['r','u','f'].every(k=>view[k]&&view[k].length===3&&view[k].every(Number.isFinite)))return null;
   let q=quaternion(view);if(!q.every(Number.isFinite))return null;
   const dt=(time-last)/1000;
   if(previous&&dt>0&&dt<.25){
    let dot=previous.reduce((n,x,i)=>n+x*q[i],0);
    if(dot<0){q=q.map(x=>-x);dot=-dot;}
    const angle=2*Math.acos(Math.min(1,dot))*180/Math.PI;
    // Large moves and display-rotation changes must not drag the sky.
    if(angle<25){
     const tau=.085/(1+angle/1.5),gain=1-Math.exp(-dt/tau);
     let a=1-gain,b=gain;
     if(dot<.9995){const theta=Math.acos(dot),sin=Math.sin(theta);a=Math.sin((1-gain)*theta)/sin;b=Math.sin(gain*theta)/sin;}
     q=q.map((x,i)=>a*previous[i]+b*x);const n=Math.hypot(...q);q=q.map(x=>x/n);
    }
   }
   previous=q;last=time;return basis(q);
  }};
 }
 const api={create};root.SkyPose=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
