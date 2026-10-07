/* Camera width calibration scales the tangent plane, not the angle itself. */
(function(root){
 'use strict';
 const D=Math.PI/180,clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
 function angle(value){return Number.isFinite(value)&&value>0&&value<170?value:45;}
 function scale(value){return Number.isFinite(value)?clamp(value,.5,2):1;}
 function apply(value,widthScale=1){const base=angle(value),raw=2*Math.atan(Math.tan(base*D/2)*scale(widthScale))/D,fov=clamp(raw,1,170);return {fov,limited:Math.abs(raw-fov)>1e-8};}
 function migrate(base,legacyScale){const oldBase=clamp(angle(base),12,110),oldAngle=clamp(oldBase*(Number.isFinite(legacyScale)?clamp(legacyScale,.7,1.4):1),12,110);return scale(Math.tan(oldAngle*D/2)/Math.tan(angle(base)*D/2));}
 function sourceName(source){return source===0?'相机报告参数':source===1?'由另一方向视角换算（估计）':'默认视角（设备未报告完整参数）';}
 const api={angle,scale,apply,migrate,sourceName};root.SkyCameraView=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
