'use strict';
const $=id=>document.getElementById(id), A=Astronomy, M=SkyMath, V=SkyVisual, D=Math.PI/180;
const canvas=$('sky'),ctx=canvas.getContext('2d',{alpha:true});
let issSnapshot=null,issStatus=null,issLoading=false;
// Five reusable halos: only bright stars draw a sprite; dim stars keep cheap crisp arcs.
const starHalos=V.colors.map(color=>{const layer=document.createElement('canvas');layer.width=layer.height=72;const c=layer.getContext('2d'),g=c.createRadialGradient(36,36,1,36,36,35);g.addColorStop(0,color+'7a');g.addColorStop(.14,color+'42');g.addColorStop(.48,color+'13');g.addColorStop(1,color+'00');c.fillStyle=g;c.fillRect(0,0,72,72);return layer;});
const dustHalo=document.createElement('canvas');dustHalo.width=dustHalo.height=96;
{const c=dustHalo.getContext('2d'),g=c.createRadialGradient(48,48,2,48,48,46);g.addColorStop(0,'#d6c6bb27');g.addColorStop(.55,'#b9a9ae13');g.addColorStop(1,'#a3a6c000');c.fillStyle=g;c.fillRect(0,0,96,96);}
let cfg={lat:39.9042,lon:116.4074,place:'北京 · 示例位置',night:false},notes={};
try{cfg={...cfg,...JSON.parse(localStorage.getItem('config')||'{}')};notes=JSON.parse(localStorage.getItem('notes')||'{}');}catch(e){}
let ar=false,arPending=false,cameraFov=45,preArFov=85,preArTracking=false;
let calibration={az:0,alt:0,scale:1};
try{calibration={...calibration,...JSON.parse(localStorage.getItem('calibration')||'{}')};}catch(e){}
let deviceView=null;
let az=180,alt=40,roll=0,fov=85,offset=0,tracking=false,sensorAccuracy=3,accuracyWarned=false,showLines=true,showGrid=true,selected=null,width=0,height=0,lastCalc=0,dirty=true,hit=[],toastTimer;
const chinese={Sirius:'天狼星',Canopus:'老人星',Arcturus:'大角星',Vega:'织女星',Capella:'五车二',Rigel:'参宿七',Procyon:'南河三',Betelgeuse:'参宿四',Altair:'牛郎星',Aldebaran:'毕宿五',Spica:'角宿一',Antares:'心宿二',Pollux:'北河三',Fomalhaut:'北落师门',Deneb:'天津四',Regulus:'轩辕十四',Polaris:'北极星',Castor:'北河二',Dubhe:'天枢',Merak:'天璇',Phecda:'天玑',Megrez:'天权',Alioth:'玉衡',Mizar:'开阳',Alkaid:'摇光',Alnitak:'参宿一',Alnilam:'参宿二',Mintaka:'参宿三',Bellatrix:'参宿五',Saiph:'参宿六',Schedar:'王良四',Caph:'王良一',Ruchbah:'阁道三',Segin:'阁道二',Acrux:'十字架二',Mimosa:'十字架三'};
const stars=STAR_DATA.map(r=>{let ra=r[2]*15*D,d=r[3]*D;return {id:'s'+r[0],name:chinese[r[1]]||r[1],en:r[1],ra:r[2],dec:r[3],mag:r[4],con:r[5],ci:r[6],dist:r[7],hip:r[8],eq:[Math.cos(d)*Math.cos(ra),Math.cos(d)*Math.sin(ra),Math.sin(d)],v:[0,0,0],az:0,alt:0,type:'恒星'};});
const starsByMagnitude=stars.slice().sort((a,b)=>a.mag-b.mag);
const bodies=[['Sun','太阳','#ffd07d'],['Moon','月亮','#ecedf1'],['Mercury','水星','#bea99b'],['Venus','金星','#ffe3b0'],['Mars','火星','#f1a285'],['Jupiter','木星','#edd6b6'],['Saturn','土星','#cfc099'],['Uranus','天王星','#a5dfdf'],['Neptune','海王星','#859eee'],['Pluto','冥王星','#c6b6a6']].map(([en,name,color])=>({id:en,en,name,color,type:en==='Moon'?'地球卫星':en==='Sun'?'恒星':en==='Pluto'?'矮行星':'行星',v:[0,0,0]}));
const deepSky=MESSIER_DATA.map(([num,cn,ra,dec,mag,type,con,ngc,en])=>{const a=ra*15*D,d=dec*D;return {id:'M'+num,name:cn||'M'+num,en:en||'Messier '+num,designation:'M'+num,ngc,ra,dec,mag,type,con,eq:[Math.cos(d)*Math.cos(a),Math.cos(d)*Math.sin(a),Math.sin(d)],v:[0,0,0],az:0,alt:0,deepSky:true};});
const byHip=new Map(stars.map(x=>[x.hip,x]));
const constellationMap=new Map();
for(const [abbr,name,en,hips,ra,dec] of CONSTELLATION_DATA){
 let s=constellationMap.get(abbr);
 if(!s){const a=ra*15*D,d=dec*D;s={id:'con'+abbr,abbr,name,en,type:'星座',constellation:true,paths:[],ra,dec,eq:[Math.cos(d)*Math.cos(a),Math.cos(d)*Math.sin(a),Math.sin(d)],v:[0,0,0],az:0,alt:0};constellationMap.set(abbr,s);}
 s.paths.push(...hips.map(path=>path.map(id=>byHip.get(id)||null)));
}
const constellations=[...constellationMap.values()];
// Center on the visible figure's J2000 vectors, including both halves of Serpens.
for(const s of constellations){const unique=new Set(s.paths.flat().filter(Boolean));if(unique.size){const sum=[0,0,0];for(const star of unique)for(let i=0;i<3;i++)sum[i]+=star.eq[i];const n=Math.hypot(...sum);if(n>.001)s.eq=sum.map(v=>v/n);}}
const catalog=[...bodies,...stars,...deepSky,...constellations],byId=new Map(catalog.map(x=>[x.id,x]));
const patterns=[{name:'北斗七星',paths:[[54061,53910,58001,59774,54061],[59774,62956,65378,67301]].map(path=>path.map(id=>byHip.get(id)||null))},...constellations.filter(s=>s.paths.length)];
const fixedPoint=(x,y,z)=>({eq:[x,y,z],v:[0,0,0]});
const eqPoint=(ra,dec)=>{const a=ra*15*D,d=dec*D;return fixedPoint(Math.cos(d)*Math.cos(a),Math.cos(d)*Math.sin(a),Math.sin(d));};
const eqGrid=[];
for(let h=0;h<24;h+=2){const line=[];for(let dec=-80;dec<=80;dec+=4)line.push(eqPoint(h,dec));eqGrid.push(line);}
for(const dec of [-60,-30,0,30,60]){const line=[];for(let ra=0;ra<=24;ra+=.2)line.push(eqPoint(ra,dec));eqGrid.push(line);}
const hourLabels=Array.from({length:12},(_,i)=>({name:i*2+'h',point:eqPoint(i*2,0)}));
const galacticDust=[];
{let seed=8191979;const rand=()=>{seed=(Math.imul(1664525,seed)+1013904223)>>>0;return seed/4294967296;};const r=A.Rotation_GAL_EQJ().rot;
 for(let i=0;i<1750;i++){const l=rand()*2*Math.PI,b=(rand()+rand()+rand()+rand()-2)*.20,x=Math.cos(b)*Math.cos(l),y=Math.cos(b)*Math.sin(l),z=Math.sin(b);
  const p=fixedPoint(r[0][0]*x+r[1][0]*y+r[2][0]*z,r[0][1]*x+r[1][1]*y+r[2][1]*z,r[0][2]*x+r[1][2]*y+r[2][2]*z);p.haze=i<370;p.size=p.haze?60+rand()*65:.45+rand()*.75;p.opacity=p.haze?.3+rand()*.35:.08+rand()*.24;galacticDust.push(p);}}
const descriptions={Sun:'太阳是距离地球最近的恒星。切勿用肉眼、望远镜或相机直接观察太阳；星图定位不代表可以安全直视。',Moon:'月球是地球的天然卫星。明暗交界线附近的地形在望远镜中更容易辨认。',Mercury:'水星运行在太阳附近，通常在日出前或日落后的低空短暂出现。',Venus:'金星常被称为启明星或长庚星，是夜空中非常明亮的行星。',Mars:'火星呈现偏橙红的色调。它与地球的距离不断变化，亮度也随之改变。',Jupiter:'木星是太阳系最大的行星。用合适的双筒镜或望远镜可尝试寻找伽利略卫星。',Saturn:'土星拥有显著的环系统，辨认光环需要望远镜。',Uranus:'天王星是冰巨星，观测通常需要双筒镜或望远镜。',Neptune:'海王星距离遥远，需要望远镜观测。',Pluto:'冥王星是柯伊伯带中的矮行星，极难通过小型望远镜目视辨认。'};
function now(){return new Date(Date.now()+offset);}function observer(){return new A.Observer(cfg.lat,cfg.lon,0);}function save(){localStorage.setItem('config',JSON.stringify(cfg));}function toast(s){$('toast').textContent=s;$('toast').style.opacity=1;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').style.opacity=0,3500);}function fmt(d){return d.toLocaleString('zh-CN',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false});}
function sync(){document.body.classList.toggle('red',cfg.night);$('night').classList.toggle('active',cfg.night);$('place').textContent=cfg.place;$('mode').textContent=ar?'实景 AR · 实验功能':tracking?(!deviceView?'正在获取自动方向':sensorAccuracy<2?'手机指向识星 · 方向待校准':'手机指向识星'):'自由探索';$('ar').classList.toggle('active',ar||arPending);$('ar').disabled=arPending;$('calibrate').hidden=!tracking;document.body.classList.toggle('ar',ar);$('track').classList.toggle('active',tracking);$('clock').textContent=fmt(now());$('time').textContent=offset===0?'◷ 现在':'◷ '+fmt(now());if(window.NativeSky)NativeSky.setCoordinates(cfg.lat,cfg.lon);dirty=true;}
function calculate(){
 if(offset!==0&&selected&&selected.id==='ISS'){selected=null;$('selection').hidden=true;$('target').textContent='';}
 const t=now(),obs=observer(),rot=A.Rotation_EQJ_HOR(t,obs).rot;
 for(const s of stars){const [x,y,z]=s.eq,n=rot[0][0]*x+rot[1][0]*y+rot[2][0]*z,w=rot[0][1]*x+rot[1][1]*y+rot[2][1]*z,u=rot[0][2]*x+rot[1][2]*y+rot[2][2]*z;s.v[0]=-w;s.v[1]=n;s.v[2]=u;s.alt=Math.asin(Math.max(-1,Math.min(1,u)))/D;s.az=(Math.atan2(-w,n)/D+360)%360;}
 for(const s of [...deepSky,...constellations]){const [x,y,z]=s.eq,n=rot[0][0]*x+rot[1][0]*y+rot[2][0]*z,w=rot[0][1]*x+rot[1][1]*y+rot[2][1]*z,u=rot[0][2]*x+rot[1][2]*y+rot[2][2]*z;s.v[0]=-w;s.v[1]=n;s.v[2]=u;s.alt=Math.asin(Math.max(-1,Math.min(1,u)))/D;s.az=(Math.atan2(-w,n)/D+360)%360;}
 // Static art and coordinate paths follow exactly the same J2000-to-horizon rotation.
 for(const s of [...eqGrid.flat(),...hourLabels.map(x=>x.point),...galacticDust]){const [x,y,z]=s.eq;s.v[0]=-(rot[0][1]*x+rot[1][1]*y+rot[2][1]*z);s.v[1]=rot[0][0]*x+rot[1][0]*y+rot[2][0]*z;s.v[2]=rot[0][2]*x+rot[1][2]*y+rot[2][2]*z;}
 for(const b of bodies){const eq=A.Equator(b.en,t,obs,true,true),h=A.Horizon(t,obs,eq.ra,eq.dec,'normal'),ill=A.Illumination(b.en,t);Object.assign(b,{ra:eq.ra,dec:eq.dec,dist:eq.dist,az:h.azimuth,alt:h.altitude,mag:ill.mag,v:M.vec(h.azimuth,h.altitude),phase:ill.phase_fraction});}
 lastCalc=Date.now();dirty=true;sync();if(selected)selection(selected);
}
function resize(){width=innerWidth;height=innerHeight;const d=Math.min(devicePixelRatio||1,2);canvas.width=width*d;canvas.height=height*d;ctx.setTransform(d,0,0,d,0,0);dirty=true;}window.addEventListener('resize',resize);
function render(){
 if(!dirty)return;dirty=false;hit=[];ctx.clearRect(0,0,width,height);
 const sunAlt=bodies[0].alt,bright=sunAlt>-6,sky=V.palette(sunAlt,cfg.night);
 if(!ar){const grad=ctx.createLinearGradient(0,0,0,height);grad.addColorStop(0,sky[0]);grad.addColorStop(.52,sky[1]);grad.addColorStop(1,sky[2]);ctx.fillStyle=grad;ctx.fillRect(0,0,width,height);}else{ctx.fillStyle='#04091526';ctx.fillRect(0,0,width,height);}
 const viewAz=az,viewAlt=alt;
 const basis=tracking&&deviceView?deviceView:M.basis(viewAz,viewAlt),p=M.projector(basis,width,height,fov,tracking?0:roll);
 if(!ar&&!cfg.night&&sunAlt>-18){const sun=p(bodies[0].v);if(sun&&sun[0]>-180&&sun[0]<width+180&&sun[1]>-180&&sun[1]<height+180){const glow=ctx.createRadialGradient(sun[0],sun[1],4,sun[0],sun[1],180);glow.addColorStop(0,'#ffcf9670');glow.addColorStop(.35,'#ffb37724');glow.addColorStop(1,'#ffb37700');ctx.fillStyle=glow;ctx.fillRect(sun[0]-180,sun[1]-180,360,360);}}
 if(!ar&&sunAlt<-9){for(const s of galacticDust){if(s.v[2]<0)continue;const q=p(s.v);if(!q||q[0]<-70||q[0]>width+70||q[1]<-70||q[1]>height+70)continue;ctx.globalAlpha=s.opacity*Math.min(1,(-sunAlt-9)/9);if(s.haze)ctx.drawImage(dustHalo,q[0]-s.size/2,q[1]-s.size/2,s.size,s.size);else{ctx.fillStyle='#c5d4e5';ctx.fillRect(q[0],q[1],s.size,s.size);}}ctx.globalAlpha=1;}
 if(showGrid){ctx.textAlign='center';ctx.strokeStyle=bright?'#e8f5ff42':'#a9b4d345';ctx.lineWidth=.7;for(const line of eqGrid){ctx.beginPath();let prev=null;for(const star of line){const q=p(star.v);if(q&&prev&&Math.hypot(q[0]-prev[0],q[1]-prev[1])<width*.55)ctx.lineTo(...q);else if(q)ctx.moveTo(...q);prev=q;}ctx.stroke();}
  ctx.fillStyle=bright?'#edfaff':'#afb8d8';ctx.font='10px system-ui';for(const label of hourLabels){const q=p(label.point.v);if(q&&q[0]>55&&q[0]<width-80&&q[1]>85&&q[1]<height-100)ctx.fillText(label.name,q[0],q[1]);}
  ctx.strokeStyle=bright?'#d4fffa90':'#8ee4d48c';ctx.fillStyle=bright?'#effff8':'#b5eee7';for(const angle of [10,20,30]){if(angle>fov*.75)continue;ctx.beginPath();for(let i=0;i<=96;i++){const t=i*2*Math.PI/96,a=angle*D,v=[Math.cos(a)*basis.f[0]+Math.sin(a)*(Math.cos(t)*basis.r[0]+Math.sin(t)*basis.u[0]),Math.cos(a)*basis.f[1]+Math.sin(a)*(Math.cos(t)*basis.r[1]+Math.sin(t)*basis.u[1]),Math.cos(a)*basis.f[2]+Math.sin(a)*(Math.cos(t)*basis.r[2]+Math.sin(t)*basis.u[2])],q=p(v);if(q){if(i===0)ctx.moveTo(...q);else ctx.lineTo(...q);}}ctx.stroke();const up=p([Math.cos(angle*D)*basis.f[0]+Math.sin(angle*D)*basis.u[0],Math.cos(angle*D)*basis.f[1]+Math.sin(angle*D)*basis.u[1],Math.cos(angle*D)*basis.f[2]+Math.sin(angle*D)*basis.u[2]]);if(up&&up[1]>90&&up[1]<height-100)ctx.fillText(angle+'°',up[0],up[1]-5);}}
 // Horizon and altitude circles are actual horizontal coordinates.
 for(let h=0;h<=60;h+=30){ctx.strokeStyle=h===0?(bright?'#effcff75':'#a9d5c055'):(bright?'#eefaff28':'#9abbe410');ctx.lineWidth=1;ctx.beginPath();let prev=null;for(let a=0;a<=360;a+=2){let q=p(M.vec(a,h));if(q&&prev&&Math.hypot(q[0]-prev[0],q[1]-prev[1])<width/3)ctx.lineTo(...q);else if(q)ctx.moveTo(...q);prev=q;}ctx.stroke();}
 ctx.font='11px system-ui';ctx.textAlign='center';ctx.fillStyle=bright?'#e8f4ff':'#93b7ac';['北 N','东 E','南 S','西 W'].forEach((n,i)=>{let q=p(M.vec(i*90,0));if(q)ctx.fillText(n,q[0],q[1]+20);});
 if(showLines){const labels=[];ctx.strokeStyle=bright?'#e8edff2e':'#99b0ff2c';ctx.lineWidth=.8;for(const group of patterns){let points=0;for(const path of group.paths){let prev=null;for(const s of path){const q=s&&s.alt>=0?p(s.v):null;if(q&&prev&&Math.hypot(q[0]-prev[0],q[1]-prev[1])<width*.8){ctx.beginPath();ctx.moveTo(...prev);ctx.lineTo(...q);ctx.stroke();}if(q&&q[0]>0&&q[0]<width&&q[1]>0&&q[1]<height)points++;prev=q;}}if(points>2){const anchor=group.constellation?group:byHip.get(62956),q=anchor.alt>=0?p(anchor.v):null;if(q&&q[0]>35&&q[0]<width-35&&q[1]>50&&q[1]<height-100)labels.push({name:group.name,x:q[0],y:q[1],points});}}labels.sort((a,b)=>b.points-a.points);ctx.font='12px system-ui';ctx.fillStyle=bright?'#e8f4ffb0':'#9caedb90';const used=[];for(const l of labels){if(used.length>=12)break;if(used.some(v=>Math.abs(v.x-l.x)<90&&Math.abs(v.y-l.y)<25))continue;ctx.fillText(l.name,l.x,l.y-20);used.push(l);}}
 if(selected&&selected.constellation&&showLines){for(const path of selected.paths){ctx.beginPath();let prev=null;for(const s of path){const q=s&&s.alt>=0?p(s.v):null;if(q&&prev&&Math.hypot(q[0]-prev[0],q[1]-prev[1])<width*.8)ctx.lineTo(...q);else if(q)ctx.moveTo(...q);prev=q;}ctx.lineWidth=9;ctx.strokeStyle='#78b9ff18';ctx.stroke();ctx.lineWidth=1.7;ctx.strokeStyle='#b2deffd0';ctx.stroke();}}
 const limit=Math.min(7,5.2+Math.log2(85/fov));let labelBoxes=[];
 function drawPoint(s){const isBody=!!s.color,r=isBody?(s.en==='Sun'?8:s.en==='Moon'?10:4):Math.max(.7,2.8-s.mag*.34);
  const visible=s.en==='Sun'||s.en==='Moon'?1:V.visibility(s.mag,sunAlt),alpha=(s.alt<0?.28:1)*Math.max(s===selected ? .55 : 0,visible);
  if(alpha<.025)return;
  const q=p(s.v);if(!q||q[0]<-15||q[0]>width+15||q[1]<-15||q[1]>height+15)return;
  const colorIndex=isBody?2:V.colorIndex(s.ci);
  ctx.globalAlpha=alpha;ctx.fillStyle=s.color||V.colors[colorIndex];
  if(!isBody&&s.mag<2.2){const glow=starHalos[colorIndex],size=s.mag<0?45:34;ctx.drawImage(glow,q[0]-size/2,q[1]-size/2,size,size);}
  if(s.en==='Moon'){
   const sun=bodies[0].v,dot=sun[0]*s.v[0]+sun[1]*s.v[1]+sun[2]*s.v[2],toward=sun.map((v,i)=>v-dot*s.v[i]),norm=Math.hypot(...toward);
   const sunward=norm>1e-8?p(s.v.map((v,i)=>v+.03*toward[i]/norm)):null;
   const angle=sunward?Math.atan2(sunward[1]-q[1],sunward[0]-q[0]):0,illum=Math.max(0,Math.min(1,s.phase));
   ctx.save();ctx.translate(q[0],q[1]);ctx.rotate(angle);
   ctx.fillStyle='#637080';ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.fill();
   ctx.fillStyle='#f5f1dd';ctx.beginPath();
   for(let j=0;j<=32;j++){const y=-1+2*j/32,x=Math.sqrt(Math.max(0,1-y*y));if(j===0)ctx.moveTo(r*x,r*y);else ctx.lineTo(r*x,r*y);}
   for(let j=32;j>=0;j--){const y=-1+2*j/32,x=(1-2*illum)*Math.sqrt(Math.max(0,1-y*y));ctx.lineTo(r*x,r*y);}
   ctx.closePath();ctx.fill();ctx.restore();
  }else{ctx.beginPath();ctx.arc(q[0],q[1],r,0,Math.PI*2);ctx.fill();}
  if(s===selected){ctx.strokeStyle='#d3deff';ctx.lineWidth=1;ctx.beginPath();ctx.arc(q[0],q[1],r+10,0,Math.PI*2);ctx.stroke();}
  if(isBody||s.mag<1.7||s===selected){ctx.font=isBody?'12px system-ui':'10px system-ui';const tw=ctx.measureText(s.name).width,box=[q[0]-tw/2,q[1]+r+8,tw,15];if(isBody||!labelBoxes.some(b=>Math.abs(b[0]-box[0])<(b[2]+box[2])/2+20&&Math.abs(b[1]-box[1])<19)){ctx.fillStyle=bright?'#f6fbff':isBody?'#e5e7f0':'#aab6d0';ctx.fillText(s.name,q[0],q[1]+r+19);labelBoxes.push(box);}}
  hit.push({s,x:q[0],y:q[1]});ctx.globalAlpha=1;
 }
 for(const s of starsByMagnitude){if(s.mag>limit)break;drawPoint(s);}
 for(const s of bodies)drawPoint(s);
 if(selected&&!selected.color&&!selected.deepSky&&!selected.constellation&&selected.mag>limit)drawPoint(selected);
 if(selected&&selected.constellation){const q=p(selected.v);if(q){ctx.strokeStyle='#c9bcff';ctx.lineWidth=2;ctx.beginPath();ctx.arc(q[0],q[1],12,0,Math.PI*2);ctx.stroke();ctx.font='13px system-ui';ctx.fillStyle='#e7dfff';ctx.fillText(selected.name,q[0],q[1]+29);}}
 // Catalog magnitudes of extended objects are integrated values; only draw a modest symbol.
 for(const s of deepSky){
  if(s!==selected&&(s.mag>6.5||fov>90||sunAlt>-9))continue;
  const q=p(s.v);if(!q||q[0]<-12||q[0]>width+12||q[1]<-12||q[1]>height+12)continue;
  ctx.globalAlpha=s.alt<0?.27:1;ctx.strokeStyle='#70d9ca';ctx.lineWidth=s===selected?2:1;
  const size=s===selected?7:4;ctx.beginPath();ctx.moveTo(q[0],q[1]-size);ctx.lineTo(q[0]+size,q[1]);ctx.lineTo(q[0],q[1]+size);ctx.lineTo(q[0]-size,q[1]);ctx.closePath();ctx.stroke();
  ctx.font='10px system-ui';ctx.fillStyle='#9ad8d0';ctx.fillText(s.designation,q[0],q[1]+size+14);
  hit.push({s,x:q[0],y:q[1]});ctx.globalAlpha=1;
 }
 if(issSnapshot&&offset===0&&Date.now()-issSnapshot.timestamp<12000&&issSnapshot.alt>=0){
  const q=p(issSnapshot.v);if(q){ctx.strokeStyle='#95f1e7';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(q[0],q[1]-8);ctx.lineTo(q[0]+8,q[1]);ctx.lineTo(q[0],q[1]+8);ctx.lineTo(q[0]-8,q[1]);ctx.closePath();ctx.stroke();ctx.font='11px system-ui';ctx.fillStyle='#c9fff6';ctx.fillText('ISS 快照',q[0],q[1]+23);hit.push({s:issSnapshot,x:q[0],y:q[1]});}
 }
 ctx.strokeStyle='#ffffff25';ctx.beginPath();ctx.moveTo(width/2-7,height/2);ctx.lineTo(width/2+7,height/2);ctx.moveTo(width/2,height/2-7);ctx.lineTo(width/2,height/2+7);ctx.stroke();
 const dirs=['北','东北','东','东南','南','西南','西','西北'];$('bearing').textContent=dirs[Math.round(viewAz/45)%8]+' · '+Math.round(viewAz)+'°';$('elevation').textContent='仰角 '+Math.round(viewAlt)+'° · 视场 '+Math.round(fov)+'° · '+(sunAlt>=0?'白天':sunAlt>=-18?'暮光':'夜间');
 const marker=$('guide');marker.hidden=true;
 if(selected&&tracking){
  if(!deviceView){$('target').textContent='正在读取方向…';}
  else if(selected.alt<0){$('target').textContent=selected.name+'在地平线下，现在无法观测';}
  else{
   const guide=M.targetGuide(selected.v,basis,width,height,fov);
   $('target').textContent=selected.name+(guide.behind?' · 请转身寻找':guide.aligned?' · ◎ 已对准':' · 向屏幕'+guide.direction+'移动手机 · 偏离 '+Math.round(guide.angle)+'°');
   if(!guide.behind&&!guide.aligned&&!guide.onScreen){marker.hidden=false;marker.style.left=guide.x+'px';marker.style.top=guide.y+'px';marker.style.transform='translate(-50%,-50%) rotate('+guide.rotation+'rad)';}
  }
 }else $('target').textContent='';
}
let lastDraw=0;function frame(t){if(!document.hidden&&t-lastDraw>=32){render();lastDraw=t;}requestAnimationFrame(frame);}requestAnimationFrame(frame);
setInterval(()=>{if(issSnapshot&&Date.now()-issSnapshot.timestamp>=12000){issSnapshot=null;if(selected&&selected.id==='ISS'){selected=null;$('selection').hidden=true;}$('target').textContent='';dirty=true;}if(!document.hidden&&Date.now()-lastCalc>30000)calculate();},1000);
function stopTrack(){if(ar||arPending)exitAR();tracking=false;roll=0;if(window.NativeSky)NativeSky.track(false);sync();}
function nativeReady(){
 if(!window.NativeSky)return;
 if(!tracking){tracking=true;deviceView=null;sync();NativeSky.track(true);}
 maybeCheckUpdate();
 if(cfg.place.includes('示例')&&!localStorage.getItem('locationSetupSeen')){
  localStorage.setItem('locationSetupSeen','1');
  const b=openSheet('首次设置观测位置');
  b.append(el('p','星图会自动跟随手机方向。要让它与当地天空对应，还需要你的观测位置。星图计算在本机完成；只有你主动查看联网天气时，所设经纬度才会发给 Open-Meteo。','copy'),
   button('使用当前位置',()=>{NativeSky.locate();toast('正在获取位置；如未授权，请选择允许定位');},'primary'),
   button('手动设置经纬度',()=>{$('loc').click();},'secondary'),
   button('稍后再设置',()=>{$('sheet').close();toast('当前仍是北京示例天空，不能用于当地识星');},'secondary'));
 }
}
function nativeTrackingStarted(){deviceView=null;sync();}
function nativePose(matrix,declination){
 if(!tracking)return;const view=M.deviceBasis(matrix,declination);if(!view)return;
 const firstPose=!deviceView;deviceView=view;az=(Math.atan2(view.f[0],view.f[1])/D+360)%360;alt=Math.asin(Math.max(-1,Math.min(1,view.f[2])))/D;roll=0;dirty=true;if(firstPose)sync();
}
function nativeSensorAccuracy(value){sensorAccuracy=Number(value);if(tracking&&sensorAccuracy<2&&!accuracyWarned){accuracyWarned=true;toast('方向精度较低：远离磁铁和金属，将手机缓慢画 8 字校准');}if(sensorAccuracy>=2)accuracyWarned=false;sync();}
function nativeUnavailable(){stopTrack();toast('此设备缺少方向传感器，可使用拖动模式');}
function nativeLocation(lat,lon){if(!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180)return;setPlace(lat,lon,'当前位置');if($('sheet').open&&$('sheetTitle').textContent==='首次设置观测位置')$('sheet').close();toast('已使用当前位置，星图和方向已更新');}
function nativeLocationError(message){toast(message+'；也可点顶部位置手动填写经纬度');}
function setPlace(lat,lon,name){issSnapshot=null;if(selected&&selected.id==='ISS'){selected=null;$('selection').hidden=true;}cfg.lat=lat;cfg.lon=lon;cfg.place=name;save();calculate();}
$('track').onclick=()=>{if(ar||arPending){exitAR();return;}if(tracking){stopTrack();return;}if(!window.NativeSky){toast('手机指向模式需在安卓 App 中使用');return;}tracking=true;sync();NativeSky.track(true);toast('方向自动跟随手机背面；请先设置实际位置');};
$('lines').onclick=()=>{showLines=!showLines;$('lines').classList.toggle('active',showLines);dirty=true;};$('grid').onclick=()=>{showGrid=!showGrid;$('grid').classList.toggle('active',showGrid);dirty=true;};$('night').onclick=()=>{cfg.night=!cfg.night;save();sync();};$('zoomIn').onclick=()=>{if(ar)return;fov=Math.max(12,fov/1.25);dirty=true;};$('zoomOut').onclick=()=>{if(ar)return;fov=Math.min(110,fov*1.25);dirty=true;};
let pointers=new Map(),start=null,moved=false,lastDist=0;
canvas.onpointerdown=e=>{canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,[e.clientX,e.clientY]);start=[e.clientX,e.clientY];moved=false;if(pointers.size===2){let ps=[...pointers.values()];lastDist=Math.hypot(ps[0][0]-ps[1][0],ps[0][1]-ps[1][1]);}};
canvas.onpointermove=e=>{if(!pointers.has(e.pointerId))return;const old=pointers.get(e.pointerId);pointers.set(e.pointerId,[e.clientX,e.clientY]);if(Math.hypot(e.clientX-start[0],e.clientY-start[1])>7)moved=true;if(!moved)return;if(ar)return;if(tracking)stopTrack();if(pointers.size===2){let ps=[...pointers.values()],dist=Math.hypot(ps[0][0]-ps[1][0],ps[0][1]-ps[1][1]);if(lastDist>0&&dist>0)fov=Math.max(12,Math.min(110,fov*lastDist/dist));lastDist=dist;}else{az=(az-(e.clientX-old[0])*fov/width+360)%360;alt=Math.max(-85,Math.min(85,alt+(e.clientY-old[1])*fov/width));}dirty=true;};
canvas.onpointerup=e=>{if(!moved&&pointers.size===1){let nearest=null,best=28;for(const p of hit){let d=Math.hypot(e.clientX-p.x,e.clientY-p.y);if(d<best){nearest=p.s;best=d;}}if(nearest)selection(nearest);else{selected=null;$('selection').hidden=true;$('hint').hidden=false;dirty=true;}}pointers.delete(e.pointerId);};canvas.onpointercancel=e=>pointers.delete(e.pointerId);canvas.onwheel=e=>{e.preventDefault();if(ar)return;fov=Math.max(12,Math.min(110,fov*(e.deltaY>0?1.1:.9)));dirty=true;};
function el(tag,text,cls){const x=document.createElement(tag);if(text!==undefined)x.textContent=text;if(cls)x.className=cls;return x;}function button(text,fn,cls){const b=el('button',text,cls);b.onclick=fn;return b;}
function openSheet(title){$('sheetTitle').textContent=title;$('sheetBody').replaceChildren();if(!$('sheet').open)$('sheet').showModal();return $('sheetBody');}$('close').onclick=()=>$('sheet').close();
function selection(s){selected=s;const box=$('selection');box.hidden=false;$('hint').hidden=true;box.replaceChildren();let d=el('div');d.append(el('b',s.name),el('small',s.type+' · '+(s.alt>=0?'地平线上方 ':'地平线下方 ')+Math.abs(s.alt).toFixed(1)+'°'));box.append(d,button('探索 →',()=>details(s)));dirty=true;}
function focus(s){selection(s);if(!tracking){az=s.az;alt=Math.max(-85,Math.min(85,s.alt));fov=Math.min(fov,65);roll=0;}if($('sheet').open)$('sheet').close();if(s.alt<0)toast(s.constellation?'星座参考中心在地平线下；部分星可能仍可见':'此天体现在位于地平线下，实际天空不可见');dirty=true;}
function details(s){if(s.id==='ISS'){showIss();return;}const b=openSheet(s.name);b.append(el('div',s.en+' / '+s.type,'tag'));b.append(el('p',s.constellation?('星座缩写 '+s.abbr+'。指向的是连线参考中心，并非星座的官方边界或可观测性判断。'+(s.paths.length?'可在星图的星座连线开关中显示图案。':'此星座没有收录连线，可搜索和定位参考中心。')):s.deepSky?('梅西耶目录 '+s.designation+(s.ngc?' / NGC '+s.ngc:'')+'，'+s.type+'，位于 '+s.con+'。目录亮度是整个天体的总星等，不能直接用来判断肉眼可见性；部分目标需要双筒镜或望远镜。坐标为近似 J2000，不显示距离。'):descriptions[s.id]||('收录于 HYG 星表。所属星座：'+s.con+'。亮度以视星等表示，数值越小越明亮。星图已考虑岁差；恒星自行和大气折射未应用于恒星显示。'),'copy'));const m=el('div',undefined,'metrics');const values=s.constellation?[['参考中心方位角',s.az.toFixed(1)+'°'],['参考中心高度角',s.alt.toFixed(1)+'°'],['连线段数',String(s.paths.reduce((n,path)=>n+Math.max(0,path.length-1),0))]]:[['方位角',s.az.toFixed(1)+'°'],['高度角',s.alt.toFixed(1)+'°'],[s.deepSky?'目录总星等':'视星等',s.mag.toFixed(2)],['距离',s.deepSky?'未收录':s.color?(s.dist<.1?Math.round(s.dist*149597870.7).toLocaleString()+' km':s.dist.toFixed(2)+' AU'):(s.dist>=100000?'未知':(s.dist*3.26156).toFixed(1)+' 光年')]];for(const [name,val] of values){let d=el('div');d.append(el('small',name),el('b',val));m.append(d);}b.append(m);if(s.id==='Moon')b.append(el('p','月面照明比例 '+(s.phase*100).toFixed(1)+'%','copy'),button('月相日历',()=>showMoonCalendar(),'secondary'));
 if(s.color){let text=[];for(const [label,dir] of [['下次升起',1],['下次落下',-1]]){try{let t=A.SearchRiseSet(s.en,observer(),dir,now(),2);text.push(label+'：'+(t?fmt(t.date):'48 小时内无此事件'));}catch(e){text.push(label+'：暂不可计算');}}b.append(el('p',text.join(' / '),'copy'));}
 b.append(button(tracking?'引导我找到它':'在星图中定位',()=>focus(s),'primary'));const note=el('textarea');note.placeholder='记录你的观测、想法或纪念…';note.value=notes[s.id]||'';note.maxLength=2000;b.append(el('label','观测笔记（保存在本机）'),note,button(Object.prototype.hasOwnProperty.call(notes,s.id)?'更新收藏与笔记':'收藏并保存笔记',()=>{notes[s.id]=note.value;localStorage.setItem('notes',JSON.stringify(notes));toast('已保存到观测收藏');},'secondary'));if(Object.prototype.hasOwnProperty.call(notes,s.id))b.append(button('取消收藏',()=>{delete notes[s.id];localStorage.setItem('notes',JSON.stringify(notes));details(s);},'secondary'));
}
function listObjects(parent,objects){if(!objects.length){parent.append(el('p','暂无匹配结果。可搜索星座、亮星中文名、英文名或 HIP 编号。','copy'));return;}for(const s of objects){let r=el('div',undefined,'row'),d=el('div');d.append(el('b',s.name),el('small',s.constellation?s.abbr+' · 星座 · 参考中心'+(s.alt>=0?'高度 ':'地平线下 ')+Math.abs(s.alt).toFixed(0)+'°':(s.deepSky?s.designation+' · '+s.type:s.color?s.type:s.con+' · 恒星')+' · '+s.mag.toFixed(1)+' 等 · '+(s.alt>=0?'高度 ':'地平线下 ')+Math.abs(s.alt).toFixed(0)+'°'));r.append(d,button('查看',()=>details(s)));parent.append(r);}}
function listDeepSky(parent){parent.replaceChildren();parent.append(el('p','110 个梅西耶天体。目录亮度不能保证肉眼可见；请结合高度、天空亮度和观测设备判断。','copy'));listObjects(parent,deepSky);}
$('search').onclick=()=>{const b=openSheet('探索天空'),input=el('input'),results=el('div');input.placeholder='星座 / English / HIP / M31 / NGC224';input.type='search';input.setAttribute('aria-label','搜索天体');b.append(input,button('🛰 ISS 实时位置',showIss,'secondary'),button('浏览 88 星座',()=>{results.replaceChildren();listObjects(results,constellations);},'secondary'),button('浏览梅西耶 110',()=>listDeepSky(results),'secondary'),results);const search=()=>{const q=input.value.trim().toLowerCase();results.replaceChildren();let result=q?catalog.filter(s=>(s.name+' '+s.en+' '+(s.con||'')+' '+(s.constellation?s.abbr:s.deepSky?s.designation+' NGC'+s.ngc:'HIP '+s.hip)).toLowerCase().includes(q)):[...bodies,...deepSky.filter(s=>s.mag<=5).slice(0,10),...stars.slice(0,15)];listObjects(results,result.slice(0,60));if(result.length>60)results.append(el('p','显示前 60 项，请输入更完整的名称。','copy'));};input.oninput=search;search();};
function showVisible(){calculate();const b=openSheet('此刻可见');b.append(button('查看未来 24 小时计划',showPlanner,'secondary'),el('p',cfg.place+' · '+fmt(now())+'。以下天体位于地平线上方；实际可见性受太阳、云层与光污染影响。','copy'));if(bodies[0].alt> -6)b.append(el('p','当前天空较亮，大多数恒星肉眼不可见。切勿直视太阳。','copy'));listObjects(b,catalog.filter(s=>s.alt>5&&!s.deepSky&&!s.constellation&&(s.color||s.mag<2)).sort((a,b)=>a.mag-b.mag).slice(0,45));if(bodies[0].alt< -6){b.append(el('h3','位置较高的深空目标'),el('p','部分需要望远镜；目录总星等不能代表肉眼可见。','copy'));listObjects(b,deepSky.filter(s=>s.alt>20&&s.mag<=6.5).sort((a,b)=>a.mag-b.mag).slice(0,15));}}
function issSheetVisible(){return $('sheet').open&&$('sheetTitle').textContent==='国际空间站 · 实时位置'&&issStatus&&issStatus.isConnected;}
function requestIss(){if(issLoading||!issSheetVisible()||!window.NativeSky||!NativeSky.fetchIss)return;issLoading=true;issStatus.textContent='正在获取空间站位置…';NativeSky.fetchIss();}
function showIss(){
 const b=openSheet('国际空间站 · 实时位置');issStatus=el('div',undefined,'copy');
 b.append(el('p','按需从 Where the ISS at? 获取国际空间站最新位置。换算成你所在位置的方位与仰角在手机内完成，不向该服务发送观测坐标。空间站移动很快，星图只显示短时位置快照，不能据此预测过境、肉眼可见性或安全对准。','copy'),el('p','观测位置：'+cfg.place+'（'+cfg.lat.toFixed(2)+'°, '+cfg.lon.toFixed(2)+'°）','copy'),issStatus);
 if(cfg.place.includes('示例')){issStatus.textContent='请先设置实际观测位置。';b.append(button('设置位置',()=>$('loc').click(),'primary'));return;}
 if(!window.NativeSky||!NativeSky.fetchIss){issStatus.textContent='实时 ISS 位置需在安卓 App 中获取。';return;}
 b.append(button('刷新当前位置',requestIss,'secondary'));requestIss();
}
function nativeIssResult(text){
 issLoading=false;if(!issSheetVisible())return;
 try{
  const d=JSON.parse(text),age=Date.now()-d.timestamp;if(!Number.isFinite(d.timestamp)||age< -10000||age>10000)throw Error('stale');
  const q=SkyISS.look(cfg.lat,cfg.lon,d.latitude,d.longitude,d.altitude);
  issSnapshot={id:'ISS',name:'国际空间站',en:'ISS',type:'空间站',timestamp:d.timestamp,az:q.az,alt:q.alt,v:M.vec(q.az,q.alt)};if(selected&&selected.id==='ISS')selected=issSnapshot;dirty=true;
  issStatus.replaceChildren(el('p','数据时间 '+new Date(d.timestamp).toLocaleString()+' · 来源：Where the ISS at? · 仅该时刻位置快照','copy'),el('p','你的天空：方位 '+q.az.toFixed(1)+'° · 仰角 '+q.alt.toFixed(1)+'° · 距离 '+q.range.toFixed(0)+' km'+(q.alt<0?' · 当前在地平线下':''),'copy'),el('p','空间站地面投影：纬度 '+d.latitude.toFixed(2)+'° · 经度 '+d.longitude.toFixed(2)+'° · 轨道高度 '+d.altitude.toFixed(0)+' km','copy'));
  if(q.alt>=0)issStatus.append(button('在星图定位此刻快照',()=>{if(!issSnapshot||Date.now()-issSnapshot.timestamp>=12000){nativeIssError('位置快照已过期，请刷新');return;}offset=0;calculate();focus(issSnapshot);},'primary'));
 }catch(e){nativeIssError('空间站数据无效或已过期，请刷新');}
}
function nativeIssError(message){issLoading=false;issSnapshot=null;if(selected&&selected.id==='ISS'){selected=null;$('selection').hidden=true;}dirty=true;if(issSheetVisible())issStatus.textContent=message;}
setInterval(()=>{if(!document.hidden&&issSheetVisible()&&!issLoading)requestIss();},8000);
let weatherStatus=null;
const WEATHER_CACHE_KEY='weatherForecastV1',WEATHER_CACHE_MAX_AGE=3*3600000;
let weatherRequestCoords=null;
function cachedWeather(){
 try{const x=JSON.parse(localStorage.getItem(WEATHER_CACHE_KEY));if(x&&Math.abs(x.lat-cfg.lat)<.00001&&Math.abs(x.lon-cfg.lon)<.00001&&x.data&&Array.isArray(x.data.hours)&&Number.isFinite(x.data.retrieved)&&Date.now()-x.data.retrieved>=0&&Date.now()-x.data.retrieved<WEATHER_CACHE_MAX_AGE)return x.data;}catch(e){}return null;
}
function weatherSheetVisible(){return $('sheet').open&&$('sheetTitle').textContent==='联网观测天气'&&weatherStatus&&weatherStatus.isConnected;}
function showWeather(){
 const b=openSheet('联网观测天气');weatherStatus=el('div',undefined,'copy');weatherRequestCoords=null;
 b.append(el('p','按所设经纬度查询 Open-Meteo 天气模型。只在点击下方按钮时发送坐标；预报从现实时间起算，不随星图穿越时间变化。云量、降水概率和能见度均为预报，不能代表现场天空，也不含光污染或地形遮挡。','copy'),el('p','观测位置：'+cfg.place+'（'+cfg.lat.toFixed(2)+'°, '+cfg.lon.toFixed(2)+'°）','copy'),weatherStatus);
 if(cfg.place.includes('示例')){weatherStatus.textContent='请先设置实际观测位置，避免获取北京示例天气。';b.append(button('设置位置',()=>$('loc').click(),'primary'));return;}
 if(!window.NativeSky||!NativeSky.fetchWeather){weatherStatus.textContent='联网天气需在安卓 App 中查看。';return;}
 b.append(button('获取未来 24 小时预报',()=>{weatherRequestCoords={lat:cfg.lat,lon:cfg.lon};weatherStatus.replaceChildren(el('p','正在获取天气模型…','copy'));NativeSky.fetchWeather(cfg.lat,cfg.lon);},'primary'),button('返回观测计划',showPlanner,'secondary'));
}
function renderWeather(d,cached=false){
 try{
  if(!Array.isArray(d.hours)||d.hours.length<1)throw Error('empty');
  const fmtValue=(v,unit)=>Number.isFinite(v)&&v>=0?Math.round(v)+unit:'暂无';
  weatherStatus.replaceChildren(el('p',(cached?'联网失败，显示上次获取的预报（非实时） · ':'')+'来源：Open-Meteo · 获取于 '+fmt(new Date(d.retrieved))+' · 模型网格 '+Number(d.latitude).toFixed(2)+'°, '+Number(d.longitude).toFixed(2)+'°','copy'),el('p',(cached?'上次模型：':'目前模型：')+'云量 '+fmtValue(d.cloud,'%')+' · 降水 '+(Number.isFinite(d.precipitation)&&d.precipitation>=0?d.precipitation.toFixed(1)+' mm':'暂无')+' · 气温 '+(Number.isFinite(d.temperature)&&d.temperature>-100?d.temperature.toFixed(1)+'°C':'暂无'),'copy'),el('h3','未来时段 · 约每 3 小时'));
  let future=0;for(const row of d.hours){if(!Array.isArray(row)||row.length!==4||!Number.isFinite(row[0])||row[0]<Date.now())continue;const card=el('div',undefined,'planner-card'),visibility=Number.isFinite(row[3])&&row[3]>=0?(row[3]/1000).toFixed(1)+' km':'暂无';card.append(el('b',fmt(new Date(row[0]))),el('p','云量 '+fmtValue(row[1],'%')+' · 降水概率 '+fmtValue(row[2],'%')+' · 模型能见度 '+visibility,'copy'));weatherStatus.append(card);future++;}if(!future)weatherStatus.append(el('p','这份预报已经没有未来时段，请联网重新获取。','copy'));
 }catch(e){weatherStatus.textContent='天气数据暂不可用，请稍后重试。';}
}
function nativeWeatherResult(text){
 if(!weatherSheetVisible())return;
 try{const d=JSON.parse(text);if(!Array.isArray(d.hours)||!d.hours.length||!Number.isFinite(d.retrieved))throw Error('invalid');renderWeather(d);if(weatherRequestCoords)try{localStorage.setItem(WEATHER_CACHE_KEY,JSON.stringify({...weatherRequestCoords,data:d}));}catch(e){}weatherRequestCoords=null;}catch(e){weatherStatus.textContent='天气数据暂不可用，请稍后重试。';}
}
function nativeWeatherError(message){if(!weatherSheetVisible())return;const previous=cachedWeather();if(previous)renderWeather(previous,true);else weatherStatus.textContent=message;weatherRequestCoords=null;}
function showPlanner(){
 const start=now(),plan=SkyPlanner.build(A,cfg.lat,cfg.lon,start),b=openSheet('未来 24 小时观测计划');
 b.append(button('🛰 ISS 实时位置',showIss,'secondary'),button('联网查看云量和降水',showWeather,'secondary'),button('查看此刻可见天体',showVisible,'secondary'),button('月相日历',()=>showMoonCalendar(),'secondary'),el('p',cfg.place+' · '+fmt(start)+' 起。时间均为手机本地时区；实际可见性还受云层、光污染和遮挡影响。','copy'));
 if(cfg.place.includes('示例'))b.append(el('p','当前使用示例位置，请先点顶部位置按钮设置实际经纬度。','copy'));
 const spans=xs=>xs.map(x=>fmt(new Date(x.start))+' — '+fmt(new Date(x.end))).join(' / ');
 b.append(el('h3','暗夜时段'),el('p',plan.dark.length?spans(plan.dark):'未来 24 小时没有太阳低于 −18° 的暗夜时段。','copy'),el('p','暗夜仅按太阳高度判断，不代表无月光。当前月面照明比例 '+(plan.moonFraction*100).toFixed(0)+'%。','copy'));
 if(offset!==0)b.append(el('p','当前星图处于自选时间，现实天气预报不参与这份历史或未来天体计划。返回现在后可查看天气辅助时段。','copy'));
 if(offset===0&&!cfg.place.includes('示例')){
  const weather=cachedWeather();
  if(weather){
   const hints=SkyPlanner.weatherHints(A,cfg.lat,cfg.lon,weather.hours,Date.now()).filter(x=>x.dark);
   b.append(el('h3','天气辅助观测'),el('p','Open-Meteo 模型 · 获取于 '+fmt(new Date(weather.retrieved))+'。仅比较有预报的时刻：太阳低于 −12°、云量不高于 35%、降水概率不高于 25%、模型能见度至少 5 km 标为较有利；不代表现场天空、光污染或安全预警。','copy'));
   if(!hints.length)b.append(el('p','缓存预报中没有未来夜间时段，请重新获取天气。','copy'));
   for(const x of hints.slice(0,6)){const card=el('div',undefined,'planner-card');card.append(el('b',fmt(new Date(x.time))+' · '+x.label),el('p','云量 '+(x.cloud>=0?x.cloud+'%':'暂无')+' · 降水概率 '+(x.rain>=0?x.rain+'%':'暂无')+' · 模型能见度 '+(x.visibility>=0?(x.visibility/1000).toFixed(1)+' km':'暂无'),'copy'),button('查看该时刻星图',()=>{stopTrack();offset=x.time-Date.now();calculate();$('sheet').close();},'secondary'));b.append(card);}
  }else b.append(el('h3','天气辅助观测'),el('p','尚无此位置近三小时的天气预报。点击上方联网按钮获取；离线天体计划照常可用。','copy'));
 }
 b.append(el('h3','月亮与行星'),el('p','筛选条件：太阳低于 −6°，目标高于 20°。按 10 分钟采样，边界约有 10 分钟误差；推荐时刻是符合条件时的最高采样点。天王星、海王星通常需要光学设备。','copy'));
 for(const target of plan.targets){const s=byId.get(target.id),card=el('div',undefined,'planner-card');card.append(el('b',s.name));if(target.best){card.append(el('p',spans(target.windows),'copy'),el('small','推荐 '+fmt(new Date(target.best.time))+' · 高度 '+target.best.alt.toFixed(0)+'°'),button('查看推荐时刻星图',()=>{stopTrack();offset=target.best.time-Date.now();calculate();focus(s);},'secondary'));}else card.append(el('p','未来 24 小时无符合条件的时段。','copy'));b.append(card);}
}
function showMoonCalendar(start=now()){
 const lunar=SkyPlanner.moonCalendar(A,start),b=openSheet('月相日历');
 const dateLabel=d=>d.toLocaleString('zh-CN',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false});
 b.append(el('p',dateLabel(start)+' · '+lunar.stage+' · 月面照明 '+(lunar.fraction*100).toFixed(1)+'%','copy'),el('p','以下列出所选时刻之后的 8 次主要月相，均为手机本地时区。月相发生时刻不代表月亮在当地可见；点击可查看所设位置的月亮方向。','copy'));
 const picker=el('input');picker.type='date';picker.setAttribute('aria-label','月相查询日期');picker.min='1900-01-01';picker.max='2100-12-31';picker.value=new Date(+start-start.getTimezoneOffset()*60000).toISOString().slice(0,10);
 b.append(el('label','选择日期（按手机本地时间中午查询）'),picker,button('查询月相',()=>{const date=new Date(picker.value+'T12:00:00');if(!picker.value||!Number.isFinite(+date)||date.getFullYear()<1900||date.getFullYear()>2100){toast('请选择 1900～2100 年的有效日期');return;}showMoonCalendar(date);},'secondary'),button('回到今天',()=>showMoonCalendar(new Date()),'secondary'));
 for(const event of lunar.events){const card=el('div',undefined,'planner-card');card.append(el('b',event.name),el('p',dateLabel(new Date(event.time)),'copy'),button('查看此时月亮',()=>{stopTrack();offset=event.time-Date.now();calculate();focus(byId.get('Moon'));},'secondary'));b.append(card);}
 b.append(button('返回观测计划',showPlanner,'secondary'));
}
$('tonight').onclick=showPlanner;
$('saved').onclick=()=>{const b=openSheet('观测收藏');const actions=el('div',undefined,'backup-actions');actions.append(button('导出备份',exportBackup),button('导入备份',importBackup));b.append(actions);const objects=Object.keys(notes).map(id=>byId.get(id)).filter(Boolean);if(!objects.length)b.append(el('p','点击任意天体，在详情中保存收藏和观测笔记。记录保存在本机，可导出 JSON 备份并在其他设备导入。','copy'));else listObjects(b,objects);};
$('loc').onclick=()=>{const b=openSheet('你在哪里看星星？');b.append(el('p','位置决定天空中天体的方向。默认是北京示例位置，请设置你的实际位置。星图在本机计算；只有你主动查看联网天气时，所设经纬度才会发送给 Open-Meteo。','copy'));b.append(button('◎ 使用手机定位',()=>{if(window.NativeSky){NativeSky.locate();toast('正在获取位置，请确保系统定位已开启');$('sheet').close();}else toast('浏览器预览请手动填写位置');},'primary'));let lat=el('input'),lon=el('input');lat.type=lon.type='number';lat.step=lon.step='any';lat.value=cfg.lat;lon.value=cfg.lon;lat.min=-90;lat.max=90;lon.min=-180;lon.max=180;b.append(el('label','纬度（北纬为正，南纬为负）'),lat,el('label','经度（东经为正，西经为负）'),lon,button('保存位置',()=>{const la=Number(lat.value),lo=Number(lon.value);if(!lat.value.trim()||!lon.value.trim()||!Number.isFinite(la)||!Number.isFinite(lo)||Math.abs(la)>90||Math.abs(lo)>180){toast('请输入有效纬度 −90～90、经度 −180～180');return;}if(window.NativeSky&&NativeSky.stopLocation)NativeSky.stopLocation();setPlace(la,lo,la.toFixed(2)+'°, '+lo.toFixed(2)+'°');$('sheet').close();},'primary'));};
$('earlier').onclick=()=>{if(ar)return;offset-=3600000;calculate();};$('later').onclick=()=>{if(ar)return;offset+=3600000;calculate();};$('time').onclick=()=>{if(ar)return;const b=openSheet('穿越时间');b.append(el('p','选择本地日期与时间，查看那一刻的天空。当前 '+fmt(now()),'copy'));const input=el('input');input.type='datetime-local';const date=now();input.value=new Date(date.getTime()-date.getTimezoneOffset()*60000).toISOString().slice(0,16);input.min='1900-01-01T00:00';input.max='2100-12-31T23:59';b.append(input,button('前往这一刻',()=>{const t=new Date(input.value);if(!input.value||!Number.isFinite(+t)||t.getFullYear()<1900||t.getFullYear()>2100){toast('请选择 1900～2100 年的有效时间');return;}offset=+t-Date.now();calculate();$('sheet').close();},'primary'),button('返回现在',()=>{offset=0;calculate();$('sheet').close();},'secondary'));};
let updateStatus=null,manualUpdate=false;
function updateSheetVisible(){return $('sheet').open&&$('sheetTitle').textContent==='应用更新'&&updateStatus&&updateStatus.isConnected;}
function maybeCheckUpdate(){
 if(!window.NativeSky||!NativeSky.checkUpdate)return;
 try{const last=Number(localStorage.getItem('updateCheckedAt')||0);if(Date.now()-last<24*3600000)return;localStorage.setItem('updateCheckedAt',String(Date.now()));}catch(e){}
 manualUpdate=false;NativeSky.checkUpdate();
}
function showUpdate(){
 const b=openSheet('应用更新');updateStatus=el('div',undefined,'copy');
 b.append(el('div','STARLIGHT 0.3.1 / 更新','tag'),el('p','可以联网检查 GitHub 上的新版。下载后的 APK 会在本机验证摘要、包名和签名，然后由 Android 系统确认安装；观测记录保留在本机。','copy'),updateStatus);
 if(!window.NativeSky||!NativeSky.checkUpdate){updateStatus.textContent='请在安卓 App 内使用检查更新。';return;}
 if(NativeSky.hasVerifiedUpdate&&NativeSky.hasVerifiedUpdate())b.append(button('安装已下载并验证的版本',()=>NativeSky.installUpdate(),'secondary'));
 b.append(button('检查新版本',()=>{manualUpdate=true;updateStatus.replaceChildren(el('p','正在连接 GitHub 检查版本…','copy'));NativeSky.checkUpdate();},'primary'));
}
function nativeUpdateAvailable(current,latest,size){
 $('help').classList.add('update-available');
 if(!updateSheetVisible()){toast('发现新版 '+latest+'，点击右侧 ? 查看更新');return;}
 updateStatus.replaceChildren(el('p','当前 '+current+' · 新版 '+latest+' · 安装包约 '+(Number(size)/1024/1024).toFixed(1)+' MB','copy'),NativeSky.hasVerifiedUpdate&&NativeSky.hasVerifiedUpdate()?button('打开系统安装界面',()=>NativeSky.installUpdate(),'primary'):button('下载并验证 '+latest,()=>{updateStatus.replaceChildren(el('p','正在下载…','copy'));NativeSky.downloadUpdate();},'primary'));
}
function nativeUpdateCurrent(version){$('help').classList.remove('update-available');if(updateSheetVisible())updateStatus.textContent='当前 '+version+'，已是最新发布版本。';}
function nativeUpdateProgress(value){if(updateSheetVisible())updateStatus.textContent='正在下载并校验：'+Math.max(0,Math.min(100,Number(value)||0))+'%';}
function nativeUpdateReady(version){if(!updateSheetVisible()){toast('新版 '+version+' 已下载并验证，打开 ? → 检查更新后安装');return;}updateStatus.replaceChildren(el('p','已验证 '+version+'。安装时 Android 会请求你确认；若首次安装此来源，请按提示授权后返回点击安装。','copy'),button('打开系统安装界面',()=>NativeSky.installUpdate(),'primary'));}
function nativeUpdatePermission(){if(updateSheetVisible())updateStatus.prepend(el('p','请在系统页面允许此来源安装应用，返回后再次点击“打开系统安装界面”。','copy'));}
function nativeUpdateError(message){if(updateSheetVisible())updateStatus.textContent=message;else if(manualUpdate)toast(message);}
$('help').onclick=()=>{const b=openSheet('把整个星空装进口袋');b.append(el('div','STARLIGHT 0.3.1 / 免费 · 本地观星','tag'),button('检查更新',showUpdate,'secondary'));for(const text of ['系统开启自动旋转后可横屏或竖屏观星。拖动星图探索，双指缩放。点击右侧准星，手机背面指向天空。方向传感器需要真机支持，请远离磁性物品。方向由传感器自动计算；齿轮可查看方向状态。','先设置位置。星图默认展示北京示例天空，未设置位置时不能用于当地识星。','天空颜色和恒星明暗随太阳高度变化，亮星带有柔和光晕；右侧网格按钮可显示赤道网格与视场圆环；这只是星图视觉提示；云量等模型预报可在观测计划页联网查看，不含光污染预测。搜索天体并定位；开启手机指向时会按目标在屏幕上的方位提示方向，目标在画面外时显示边缘箭头。地平线下方的天体以暗色显示，实际天空不可见。','此版本收录 15,598 颗 7 等及更亮的恒星、110 个梅西耶深空目标，计算太阳、月亮与八个地外行星/矮行星。提供 86 个星座连线和北斗七星星群连线，88 个星座均可搜索定位参考中心。','这是独立开发的免费预览版，与 Night Sky 无隶属关系。相机 AR 为实验性的方向传感器叠加，尚不含空间识别、行星 AR 模型、卫星/ISS 追踪、云端十亿星库、AI、光污染地图、空间音频或多人同步。手机性能、相机兼容性与方向精度尚待真机测试。','数据：HYG v4.1（CC BY-SA 4.0）；星座连线：johanley（CC0）；星座名称及中心：d3-celestial（BSD 3-Clause）；梅西耶目录：Bretton Wade（MIT，坐标近似 J2000）；天文计算：Astronomy Engine 2.1.19（MIT）。完整许可随源码提供。'])b.append(el('p',text,'copy'));};
function exportBackup(){
 const text=SkyBackup.encode(notes);
 if(window.NativeSky&&NativeSky.exportNotes){NativeSky.exportNotes(text);return;}
 const b=openSheet('复制观测备份'),area=el('textarea');area.value=text;area.readOnly=true;b.append(el('p','复制以下 JSON 并保存为文本文件。','copy'),area);
}
function importBackup(){
 if(window.NativeSky&&NativeSky.importNotes){NativeSky.importNotes();return;}
 const b=openSheet('导入观测备份'),area=el('textarea');area.placeholder='粘贴星野导出的 JSON';b.append(area,button('导入并保留已有记录',()=>nativeImportNotes(area.value),'primary'));
}
function nativeImportNotes(text){
 try{const result=SkyBackup.merge(text,notes,new Set(byId.keys()));localStorage.setItem('notes',JSON.stringify(result.notes));notes=result.notes;$('saved').click();toast('新增 '+result.added+' 条，保留本机 '+result.kept+' 条，跳过 '+result.skipped+' 条');}
 catch(e){toast('导入失败：请使用有效的星野 JSON 备份');}
}
function exitAR(){
 const was=ar||arPending;ar=false;arPending=false;
 if(window.NativeSky&&NativeSky.camera)NativeSky.camera(false);
 if(was){fov=preArFov;tracking=preArTracking;roll=0;if(window.NativeSky)NativeSky.track(tracking);}
 sync();
}
function nativeCameraReady(value){
 if(!arPending&&!ar)return;
 cameraFov=Number.isFinite(value)?Math.max(12,Math.min(110,value)):45;
 arPending=false;ar=true;tracking=true;fov=Math.max(12,Math.min(110,cameraFov*calibration.scale));sync();
}
function nativeCameraStopped(message){exitAR();toast(message);}
$('ar').onclick=()=>{
 if(ar||arPending){exitAR();return;}
 if(!window.NativeSky||!NativeSky.camera){toast('相机 AR 需在新版安卓 App 中使用');return;}
 const b=openSheet('实景观星 · 实验功能');b.append(el('p','将手机背面指向天空，星图将叠加在相机预览上。只预览，不拍照、不录音、不上传。标记由位置和方向传感器计算，不是从照片识别天体。','copy'),el('p','请先设置实际位置并远离磁铁。相机视场与指南针可能有偏差，可使用校准。AR 会返回当前时间。切勿对准太阳观测。','copy'),button('开启相机 AR',()=>{
  preArFov=fov;preArTracking=tracking;arPending=true;offset=0;tracking=true;calculate();$('sheet').close();NativeSky.track(true);NativeSky.camera(true);
 },'primary'));
};
function saveCalibration(){localStorage.setItem('calibration',JSON.stringify(calibration));dirty=true;}
$('calibrate').onclick=()=>{
 const b=openSheet('自动方向状态');b.append(el('p','方向由手机姿态传感器自动确定，并按位置修正磁偏角，无需指定东南西北。旧版保存的方向偏移不再用于星图。','copy'),el('p',sensorAccuracy<2?'传感器报告精度较低。请取下磁性手机壳，远离金属和磁铁，缓慢转动手机后再试。':'传感器正在提供方向；请确保位置设置正确。','copy'));
 if(ar){const input=el('input'),label=el('label','相机视场比例 '+calibration.scale);input.type='range';input.min=.7;input.max=1.4;input.step=.02;input.value=calibration.scale;input.oninput=()=>{calibration.scale=Number(input.value);label.textContent='相机视场比例 '+input.value;fov=Math.max(12,Math.min(110,cameraFov*calibration.scale));saveCalibration();};b.append(label,input);}
 b.append(button('重置相机视场',()=>{calibration={az:0,alt:0,scale:1};localStorage.removeItem('calibration');if(ar)fov=cameraFov;dirty=true;$('sheet').close();},'secondary'));
};
resize();sync();calculate();
