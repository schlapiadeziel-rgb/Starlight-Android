/* Pure projection math: East, North, Up. Units: radians internally. */
(function(root){
 const D=Math.PI/180;
 function vec(az,alt){az*=D;alt*=D;return [Math.sin(az)*Math.cos(alt),Math.cos(az)*Math.cos(alt),Math.sin(alt)];}
 function basis(az,alt){let a=az*D,h=alt*D;return {f:vec(az,alt),r:[Math.cos(a),-Math.sin(a),0],u:[-Math.sin(a)*Math.sin(h),-Math.cos(a)*Math.sin(h),Math.cos(h)]};}
 function dot(a,b){return a[0]*b[0]+a[1]*b[1]+a[2]*b[2];}
 function project(v,b,w,h,fov,roll=0){let z=dot(v,b.f);if(z<=.03)return null;let x=dot(v,b.r),y=dot(v,b.u),c=Math.cos(roll),s=Math.sin(roll),f=w/(2*Math.tan(fov*D/2));return [w/2+(x*c-y*s)*f/z,h/2-(x*s+y*c)*f/z];}
 function delta(a,b){return ((a-b+540)%360)-180;}
 function deviceBasis(matrix,declination=0){
  if(!Array.isArray(matrix)||matrix.length!==9||!matrix.every(Number.isFinite)||!Number.isFinite(declination))return null;
  const a=declination*D,c=Math.cos(a),s=Math.sin(a);
  const turn=v=>[v[0]*c+v[1]*s,v[1]*c-v[0]*s,v[2]];
  return {r:turn([matrix[0],matrix[3],matrix[6]]),u:turn([matrix[1],matrix[4],matrix[7]]),f:turn([-matrix[2],-matrix[5],-matrix[8]])};
 }
 const api={vec,basis,project,delta,deviceBasis};root.SkyMath=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
