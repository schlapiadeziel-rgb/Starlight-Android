/* Lunar directory centers, projected by the inverse of the texture viewer's rotation. */
(function(root){
 'use strict';
 const D=Math.PI/180;
 function project(feature,view={},width=320,height=width,phase=180){
  const latitude=feature.lat*D,longitude=feature.lon*D,c=Math.cos(latitude);
  const bx=c*Math.sin(longitude),by=Math.sin(latitude),bz=c*Math.cos(longitude);
  const yaw=(view.yaw||0)*D,pitch=Math.max(-85,Math.min(85,view.pitch||0))*D,zoom=Math.max(1,Math.min(4,view.zoom||1));
  const x=bx*Math.cos(yaw)-bz*Math.sin(yaw),z1=bx*Math.sin(yaw)+bz*Math.cos(yaw),up=by*Math.cos(pitch)-z1*Math.sin(pitch),front=by*Math.sin(pitch)+z1*Math.cos(pitch);
  const a=phase*D,light=view.inspect?front:Math.max(0,bx*Math.sin(a)-bz*Math.cos(a));
  return {feature,x:width/2*(1+x*zoom),y:height/2*(1-up*zoom),front,light};
 }
 function visible(features,view,width,height,phase){return features.map(f=>project(f,view,width,height,phase)).filter(p=>p.front>.025&&p.light>.035&&p.x>=5&&p.x<=width-5&&p.y>=5&&p.y<=height-5);}
 function pick(markers,x,y){let best=null,distance=18;for(const marker of markers){const d=Math.hypot(marker.x-x,marker.y-y);if(d<distance){best=marker.feature;distance=d;}}return best;}
 // Default view names maria and the largest craters. Zoom or a selection reveals the rest.
 function showName(marker,zoom,selected){
  if(!marker||!marker.feature)return false;
  if(selected)return true;
  const z=Number.isFinite(zoom)?Math.max(1,Math.min(4,zoom)):1;
  if(z>=2.4)return true;
  const d=marker.feature.diameter;
  if(marker.feature.kind!=='crater')return z>=1.4||d>=320;
  return d>=(z>=1.65?78:150);
 }
 function draw(ctx,markers,width,height,selectedId,labels,zoom=1){
  const candidates=[],symbols=[];
  ctx.save();ctx.textAlign='center';ctx.textBaseline='alphabetic';ctx.lineJoin='round';ctx.lineWidth=1.25;ctx.strokeStyle='#0c152099';
  for(const marker of markers){
   const selected=marker.feature.id===selectedId,r=selected?4.5:1.35;
   ctx.strokeStyle=selected?'#e7f6f6':'#d5e4e888';ctx.fillStyle=selected?'#e7f6f6':'#d5e4e888';ctx.lineWidth=1;
   ctx.beginPath();ctx.arc(marker.x,marker.y,r,0,Math.PI*2);if(selected)ctx.stroke();else ctx.fill();
   if(!showName(marker,zoom,selected))continue;
   symbols.push({left:marker.x-r-2,right:marker.x+r+2,top:marker.y-r-2,bottom:marker.y+r+2});
   const size=selected?11:10;
   ctx.font=(selected?'600 ':'500 ')+size+'px system-ui';
   candidates.push({id:'moon'+marker.feature.id,name:marker.feature.name,x:marker.x,y:marker.y,radius:r+1,size,width:ctx.measureText(marker.feature.name).width,
    priority:selected?100:marker.feature.kind==='crater'?40+Math.min(15,marker.feature.diameter/30):60,alpha:selected?1:.86,color:selected?'#e7f6f6':'#d5e3e6'});
  }
  ctx.lineJoin='round';ctx.lineWidth=1.25;ctx.strokeStyle='#0c152099';
  for(const label of labels.layout(candidates,width,height,[],symbols)){ctx.font=(label.priority>=100?'600 ':'500 ')+label.size+'px system-ui';ctx.globalAlpha=label.alpha;ctx.fillStyle=label.color;ctx.strokeText(label.name,label.textX,label.textY);ctx.fillText(label.name,label.textX,label.textY);ctx.globalAlpha=1;}
  ctx.restore();
 }
 const api={project,visible,pick,draw,showName};root.SkyMoonFeatures=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
