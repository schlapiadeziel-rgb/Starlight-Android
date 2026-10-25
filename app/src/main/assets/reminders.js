(function(root){
 'use strict';const MINUTE=60000,YEAR=365*24*60*MINUTE;
 const text=s=>typeof s==='string'&&s.trim().length>0&&s.length<=80&&!/[\x00-\x1f\x7f]/.test(s);
 function valid(s){return !!s&&typeof s.target==='string'&&/^[A-Za-z0-9_-]{1,40}$/.test(s.target)&&text(s.name)&&text(s.place)&&Number.isInteger(s.time)&&s.time>0&&s.time<=4102444800000&&[0,10,30,60].includes(s.lead)&&Number.isFinite(s.lat)&&Math.abs(s.lat)<=90&&Number.isFinite(s.lon)&&Math.abs(s.lon)<=180;}
 function request(s,now=Date.now()){if(!valid(s))throw Error('提醒资料无效，请检查时间和位置');if(s.time-s.lead*MINUTE<now+MINUTE)throw Error('提醒须在一分钟后，请调整时刻或提前量');if(s.time>now+YEAR)throw Error('请选择未来一年内的时刻');return {target:s.target,name:s.name,time:s.time,lead:s.lead,lat:s.lat,lon:s.lon,place:s.place};}
 function snapshot(raw){try{const x=typeof raw==='string'?JSON.parse(raw):raw;if(!x||!Array.isArray(x.items))return null;return {enabled:x.enabled===true,items:x.items.filter(s=>valid(s)&&Number.isInteger(s.id)&&s.id>0&&[0,1,2,3].includes(s.state)).sort((a,b)=>(a.state===0?0:1)-(b.state===0?0:1)||a.time-b.time)};}catch(e){return null;}}
 function localInput(time){const d=new Date(time);return Number.isFinite(+d)?new Date(time-d.getTimezoneOffset()*MINUTE).toISOString().slice(0,16):'';}
 function parseInput(value){if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value))return NaN;const t=+new Date(value);return Number.isFinite(t)&&localInput(t)===value?t:NaN;}
 const api={valid,request,snapshot,localInput,parseInput};root.SkyReminders=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
