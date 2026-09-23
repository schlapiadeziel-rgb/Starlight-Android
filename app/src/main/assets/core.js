/* Pure projection math: East, North, Up. Units: radians internally. */
(function(root){
 const D=Math.PI/180;
 function vec(az,alt){az*=D;alt*=D;return [Math.sin(az)*Math.cos(alt),Math.cos(az)*Math.cos(alt),Math.sin(alt)];}
 function basis(az,alt){let a=az*D,h=alt*D;return {f:vec(az,alt),r:[Math.cos(a),-Math.sin(a),0],u:[-Math.sin(a)*Math.sin(h),-Math.cos(a)*Math.sin(h),Math.cos(h)]};}
 function dot(a,b){return a[0]*b[0]+a[1]*b[1]+a[2]*b[2];}
 function projector(b,w,h,fov,roll=0){const c=Math.cos(roll),s=Math.sin(roll),f=w/(2*Math.tan(fov*D/2));return v=>{const z=dot(v,b.f);if(z<=.03)return null;const x=dot(v,b.r),y=dot(v,b.u);return [w/2+(x*c-y*s)*f/z,h/2-(x*s+y*c)*f/z];};}
 function project(v,b,w,h,fov,roll=0){return projector(b,w,h,fov,roll)(v);}
 function delta(a,b){return ((a-b+540)%360)-180;}
 function deviceBasis(matrix,declination=0){
  if(!Array.isArray(matrix)||matrix.length!==9||!matrix.every(Number.isFinite)||!Number.isFinite(declination))return null;
  const a=declination*D,c=Math.cos(a),s=Math.sin(a);
  const turn=v=>[v[0]*c+v[1]*s,v[1]*c-v[0]*s,v[2]];
  return {r:turn([matrix[0],matrix[3],matrix[6]]),u:turn([matrix[1],matrix[4],matrix[7]]),f:turn([-matrix[2],-matrix[5],-matrix[8]])};
 }
 function targetGuide(v,b,w,h,fov,roll=0){
  const z=dot(v,b.f),angle=Math.acos(Math.max(-1,Math.min(1,z)))/D;
  if(z<=.03)return {behind:true,angle};
  const q=project(v,b,w,h,fov,roll),dx=q[0]-w/2,dy=q[1]-h/2;
  const left=20,right=w-20,top=Math.min(110,h/2),bottom=Math.max(h/2,h-150);
  const onScreen=q[0]>=left&&q[0]<=right&&q[1]>=top&&q[1]<=bottom;
  const ux=dx/Math.max(1,Math.hypot(dx,dy)),uy=dy/Math.max(1,Math.hypot(dx,dy));
  const horizontal=ux>.32?'右':ux<-.32?'左':'',vertical=uy<-.32?'上':uy>.32?'下':'';
  const direction=horizontal+vertical;
  // The line from the screen center to the target meets the safe HUD border here.
  const edgeScale=Math.min(dx>0?(right-w/2)/dx:dx<0?(left-w/2)/dx:Infinity,dy>0?(bottom-h/2)/dy:dy<0?(top-h/2)/dy:Infinity);
  const x=onScreen?q[0]:w/2+dx*edgeScale,y=onScreen?q[1]:h/2+dy*edgeScale;
  return {behind:false,aligned:angle<3,onScreen,direction,angle,x,y,rotation:Math.atan2(dy,dx)};
 }
 const api={vec,basis,project,projector,delta,deviceBasis,targetGuide};root.SkyMath=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
