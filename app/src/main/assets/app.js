'use strict';
const $=id=>document.getElementById(id), A=Astronomy, M=SkyMath, D=Math.PI/180;
const canvas=$('sky'),ctx=canvas.getContext('2d',{alpha:true});
let cfg={lat:39.9042,lon:116.4074,place:'北京 · 示例位置',night:false},notes={};
try{cfg={...cfg,...JSON.parse(localStorage.getItem('config')||'{}')};notes=JSON.parse(localStorage.getItem('notes')||'{}');}catch(e){}
let ar=false,arPending=false,cameraFov=45,preArFov=85,preArTracking=false;
let calibration={az:0,alt:0,scale:1};
try{calibration={...calibration,...JSON.parse(localStorage.getItem('calibration')||'{}')};}catch(e){}
let az=180,alt=40,roll=0,fov=85,offset=0,tracking=false,showLines=true,selected=null,width=0,height=0,lastCalc=0,dirty=true,hit=[],toastTimer;
const chinese={Sirius:'天狼星',Canopus:'老人星',Arcturus:'大角星',Vega:'织女星',Capella:'五车二',Rigel:'参宿七',Procyon:'南河三',Betelgeuse:'参宿四',Altair:'牛郎星',Aldebaran:'毕宿五',Spica:'角宿一',Antares:'心宿二',Pollux:'北河三',Fomalhaut:'北落师门',Deneb:'天津四',Regulus:'轩辕十四',Polaris:'北极星',Castor:'北河二',Dubhe:'天枢',Merak:'天璇',Phecda:'天玑',Megrez:'天权',Alioth:'玉衡',Mizar:'开阳',Alkaid:'摇光',Alnitak:'参宿一',Alnilam:'参宿二',Mintaka:'参宿三',Bellatrix:'参宿五',Saiph:'参宿六',Schedar:'王良四',Caph:'王良一',Ruchbah:'阁道三',Segin:'阁道二',Acrux:'十字架二',Mimosa:'十字架三'};
const stars=STAR_DATA.map(r=>{let ra=r[2]*15*D,d=r[3]*D;return {id:'s'+r[0],name:chinese[r[1]]||r[1],en:r[1],ra:r[2],dec:r[3],mag:r[4],con:r[5],ci:r[6],dist:r[7],hip:r[8],eq:[Math.cos(d)*Math.cos(ra),Math.cos(d)*Math.sin(ra),Math.sin(d)],v:[0,0,0],az:0,alt:0,type:'恒星'};});
const bodies=[['Sun','太阳','#ffd07d'],['Moon','月亮','#ecedf1'],['Mercury','水星','#bea99b'],['Venus','金星','#ffe3b0'],['Mars','火星','#f1a285'],['Jupiter','木星','#edd6b6'],['Saturn','土星','#cfc099'],['Uranus','天王星','#a5dfdf'],['Neptune','海王星','#859eee'],['Pluto','冥王星','#c6b6a6']].map(([en,name,color])=>({id:en,en,name,color,type:en==='Moon'?'地球卫星':en==='Sun'?'恒星':en==='Pluto'?'矮行星':'行星',v:[0,0,0]}));
const catalog=[...bodies,...stars],byId=new Map(catalog.map(x=>[x.id,x])),byHip=new Map(stars.map(x=>[x.hip,x]));
const patterns=[{name:'北斗七星',paths:[[54061,53910,58001,59774,54061],[59774,62956,65378,67301]]},{name:'猎户座',paths:[[27989,25336,25930,26311,26727,27989],[25336,24436,27366,27989],[24436,25930],[27366,26727]]},{name:'仙后座',paths:[[746,3179,4427,6686,8886]]},{name:'天鹅座',paths:[[102098,100453,95947],[104732,100453,94779]]},{name:'天琴座',paths:[[91262,91971,92420,93194,92791,91971]]},{name:'南十字座',paths:[[60718,61084],[62434,59747]]},{name:'狮子座',paths:[[49669,50583,50335,48455,47908],[50583,54872,57632,54879,49669]]},{name:'天蝎座',paths:[[78820,78401,78265],[78401,80112,80763,81266,82396,82514,82729,84143,86228,87073,86670,85927,85696]]}];
const descriptions={Sun:'太阳是距离地球最近的恒星。切勿用肉眼、望远镜或相机直接观察太阳；星图定位不代表可以安全直视。',Moon:'月球是地球的天然卫星。明暗交界线附近的地形在望远镜中更容易辨认。',Mercury:'水星运行在太阳附近，通常在日出前或日落后的低空短暂出现。',Venus:'金星常被称为启明星或长庚星，是夜空中非常明亮的行星。',Mars:'火星呈现偏橙红的色调。它与地球的距离不断变化，亮度也随之改变。',Jupiter:'木星是太阳系最大的行星。用合适的双筒镜或望远镜可尝试寻找伽利略卫星。',Saturn:'土星拥有显著的环系统，辨认光环需要望远镜。',Uranus:'天王星是冰巨星，观测通常需要双筒镜或望远镜。',Neptune:'海王星距离遥远，需要望远镜观测。',Pluto:'冥王星是柯伊伯带中的矮行星，极难通过小型望远镜目视辨认。'};
function now(){return new Date(Date.now()+offset);}function observer(){return new A.Observer(cfg.lat,cfg.lon,0);}function save(){localStorage.setItem('config',JSON.stringify(cfg));}function toast(s){$('toast').textContent=s;$('toast').style.opacity=1;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').style.opacity=0,3500);}function fmt(d){return d.toLocaleString('zh-CN',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false});}
function sync(){document.body.classList.toggle('red',cfg.night);$('night').classList.toggle('active',cfg.night);$('place').textContent=cfg.place;$('mode').textContent=ar?'实景 AR · 实验功能':tracking?'手机指向识星':'自由探索';$('ar').classList.toggle('active',ar||arPending);$('ar').disabled=arPending;$('calibrate').hidden=!ar;document.body.classList.toggle('ar',ar);$('track').classList.toggle('active',tracking);$('clock').textContent=fmt(now());$('time').textContent=offset===0?'◷ 现在':'◷ '+fmt(now());if(window.NativeSky)NativeSky.setCoordinates(cfg.lat,cfg.lon);dirty=true;}
function calculate(){
 const t=now(),obs=observer(),rot=A.Rotation_EQJ_HOR(t,obs).rot;
 for(const s of stars){const [x,y,z]=s.eq,n=rot[0][0]*x+rot[1][0]*y+rot[2][0]*z,w=rot[0][1]*x+rot[1][1]*y+rot[2][1]*z,u=rot[0][2]*x+rot[1][2]*y+rot[2][2]*z;s.v[0]=-w;s.v[1]=n;s.v[2]=u;s.alt=Math.asin(Math.max(-1,Math.min(1,u)))/D;s.az=(Math.atan2(-w,n)/D+360)%360;}
 for(const b of bodies){const eq=A.Equator(b.en,t,obs,true,true),h=A.Horizon(t,obs,eq.ra,eq.dec,'normal'),ill=A.Illumination(b.en,t);Object.assign(b,{ra:eq.ra,dec:eq.dec,dist:eq.dist,az:h.azimuth,alt:h.altitude,mag:ill.mag,v:M.vec(h.azimuth,h.altitude),phase:ill.phase_fraction});}
 lastCalc=Date.now();dirty=true;sync();if(selected)selection(selected);
}
function resize(){width=innerWidth;height=innerHeight;const d=Math.min(devicePixelRatio||1,2);canvas.width=width*d;canvas.height=height*d;ctx.setTransform(d,0,0,d,0,0);dirty=true;}window.addEventListener('resize',resize);
function render(){
 if(!dirty)return;dirty=false;hit=[];ctx.clearRect(0,0,width,height);
 const grad=ctx.createLinearGradient(0,0,width,height);grad.addColorStop(0,'#060a15');grad.addColorStop(.5,'#101a30');grad.addColorStop(1,'#070b16');if(!ar){ctx.fillStyle=grad;ctx.fillRect(0,0,width,height);}else{ctx.fillStyle='#04091526';ctx.fillRect(0,0,width,height);}
 const basis=M.basis(ar?(az+calibration.az+360)%360:az,ar?Math.max(-89,Math.min(89,alt+calibration.alt)):alt),p=v=>M.project(v,basis,width,height,fov,roll);
 // Horizon and altitude circles are actual horizontal coordinates.
 for(let h=0;h<=60;h+=30){ctx.strokeStyle=h===0?'#a9d5c055':'#9abbe410';ctx.lineWidth=1;ctx.beginPath();let prev=null;for(let a=0;a<=360;a+=2){let q=p(M.vec(a,h));if(q&&prev&&Math.hypot(q[0]-prev[0],q[1]-prev[1])<width/3)ctx.lineTo(...q);else if(q)ctx.moveTo(...q);prev=q;}ctx.stroke();}
 ctx.font='11px system-ui';ctx.textAlign='center';ctx.fillStyle='#93b7ac';['北 N','东 E','南 S','西 W'].forEach((n,i)=>{let q=p(M.vec(i*90,0));if(q)ctx.fillText(n,q[0],q[1]+20);});
 if(showLines){for(const group of patterns){ctx.strokeStyle='#99b0ff42';ctx.lineWidth=.8;let points=[];for(const path of group.paths){let prev=null;for(const hip of path){const s=byHip.get(hip),q=s?p(s.v):null;if(q&&prev&&Math.hypot(q[0]-prev[0],q[1]-prev[1])<width*.8){ctx.beginPath();ctx.moveTo(...prev);ctx.lineTo(...q);ctx.stroke();}if(q&&q[0]>0&&q[0]<width&&q[1]>0&&q[1]<height)points.push(q);prev=q;}}if(points.length>2){let x=points.reduce((a,q)=>a+q[0],0)/points.length,y=points.reduce((a,q)=>a+q[1],0)/points.length;ctx.font='12px system-ui';ctx.fillStyle='#9caedb90';ctx.fillText(group.name,x,y-20);}}}
 const limit=Math.min(7,5.2+Math.log2(85/fov));let labelBoxes=[];
 for(const s of [...stars,...bodies]){
  if(s.mag>limit&&s!==selected)continue;const q=p(s.v);if(!q||q[0]<-15||q[0]>width+15||q[1]<-15||q[1]>height+15)continue;
  const isBody=!!s.color,r=isBody?(s.en==='Sun'||s.en==='Moon'?8:4):Math.max(.65,2.5-s.mag*.30);
  ctx.globalAlpha=s.alt<0?.28:1;ctx.fillStyle=s.color||(s.ci>1?'#ffd4ab':s.ci<.1?'#cadbff':'#eef1ff');
  if(s.mag<1.5){ctx.globalAlpha*=.13;ctx.beginPath();ctx.arc(q[0],q[1],r*3,0,Math.PI*2);ctx.fill();ctx.globalAlpha=s.alt<0?.28:1;}
  ctx.beginPath();ctx.arc(q[0],q[1],r,0,Math.PI*2);ctx.fill();
  if(s===selected){ctx.strokeStyle='#d3deff';ctx.lineWidth=1;ctx.beginPath();ctx.arc(q[0],q[1],r+10,0,Math.PI*2);ctx.stroke();}
  if(isBody||s.mag<1.7||s===selected){ctx.font=isBody?'12px system-ui':'10px system-ui';const tw=ctx.measureText(s.name).width,box=[q[0]-tw/2,q[1]+r+8,tw,15];if(isBody||!labelBoxes.some(b=>Math.abs(b[0]-box[0])<(b[2]+box[2])/2+20&&Math.abs(b[1]-box[1])<19)){ctx.fillStyle=isBody?'#e5e7f0':'#aab6d0';ctx.fillText(s.name,q[0],q[1]+r+19);labelBoxes.push(box);}}
  hit.push({s,x:q[0],y:q[1]});ctx.globalAlpha=1;
 }
 ctx.strokeStyle='#ffffff25';ctx.beginPath();ctx.moveTo(width/2-7,height/2);ctx.lineTo(width/2+7,height/2);ctx.moveTo(width/2,height/2-7);ctx.lineTo(width/2,height/2+7);ctx.stroke();
 const dirs=['北','东北','东','东南','南','西南','西','西北'];$('bearing').textContent=dirs[Math.round(az/45)%8]+' · '+Math.round(az)+'°';$('elevation').textContent='仰角 '+Math.round(alt)+'° · 视场 '+Math.round(fov)+'°';
 if(selected&&tracking){const da=M.delta(selected.az,az),dh=selected.alt-alt;$('target').textContent=selected.name+'  '+(Math.abs(da)<3&&Math.abs(dh)<3?'◎ 已对准':(da>0?'向右 ':'向左 ')+Math.round(Math.abs(da))+'° · '+(dh>0?'抬高 ':'降低 ')+Math.round(Math.abs(dh))+'°');}else $('target').textContent='';
}
let lastDraw=0;function frame(t){if(!document.hidden&&t-lastDraw>=32){render();lastDraw=t;}requestAnimationFrame(frame);}requestAnimationFrame(frame);
setInterval(()=>{if(!document.hidden&&Date.now()-lastCalc>30000)calculate();},1000);
function stopTrack(){if(ar||arPending)exitAR();tracking=false;roll=0;if(window.NativeSky)NativeSky.track(false);sync();}
function nativeOrientation(a,h,r){if(!tracking)return;const smooth=ar?.65:.25;az=(az+M.delta(a,az)*smooth+360)%360;alt+=(h-alt)*smooth;roll=r;dirty=true;}
function nativeUnavailable(){stopTrack();toast('此设备缺少方向传感器，可使用拖动模式');}
function nativeLocation(lat,lon){setPlace(lat,lon,'当前位置');toast('位置已更新');}
function setPlace(lat,lon,name){cfg.lat=lat;cfg.lon=lon;cfg.place=name;save();calculate();}
$('track').onclick=()=>{if(ar||arPending){exitAR();return;}if(tracking){stopTrack();return;}if(!window.NativeSky){toast('手机指向模式需在安卓 App 中使用');return;}tracking=true;sync();NativeSky.track(true);toast('将手机背面朝向天空；远离磁性手机壳和金属');};
$('lines').onclick=()=>{showLines=!showLines;$('lines').classList.toggle('active',showLines);dirty=true;};$('night').onclick=()=>{cfg.night=!cfg.night;save();sync();};$('zoomIn').onclick=()=>{if(ar)return;fov=Math.max(12,fov/1.25);dirty=true;};$('zoomOut').onclick=()=>{if(ar)return;fov=Math.min(110,fov*1.25);dirty=true;};
let pointers=new Map(),start=null,moved=false,lastDist=0;
canvas.onpointerdown=e=>{canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,[e.clientX,e.clientY]);start=[e.clientX,e.clientY];moved=false;if(pointers.size===2){let ps=[...pointers.values()];lastDist=Math.hypot(ps[0][0]-ps[1][0],ps[0][1]-ps[1][1]);}};
canvas.onpointermove=e=>{if(!pointers.has(e.pointerId))return;const old=pointers.get(e.pointerId);pointers.set(e.pointerId,[e.clientX,e.clientY]);if(Math.hypot(e.clientX-start[0],e.clientY-start[1])>7)moved=true;if(!moved)return;if(ar)return;if(tracking)stopTrack();if(pointers.size===2){let ps=[...pointers.values()],dist=Math.hypot(ps[0][0]-ps[1][0],ps[0][1]-ps[1][1]);if(lastDist>0&&dist>0)fov=Math.max(12,Math.min(110,fov*lastDist/dist));lastDist=dist;}else{az=(az-(e.clientX-old[0])*fov/width+360)%360;alt=Math.max(-85,Math.min(85,alt+(e.clientY-old[1])*fov/width));}dirty=true;};
canvas.onpointerup=e=>{if(!moved&&pointers.size===1){let nearest=null,best=28;for(const p of hit){let d=Math.hypot(e.clientX-p.x,e.clientY-p.y);if(d<best){nearest=p.s;best=d;}}if(nearest)selection(nearest);else{selected=null;$('selection').hidden=true;$('hint').hidden=false;dirty=true;}}pointers.delete(e.pointerId);};canvas.onpointercancel=e=>pointers.delete(e.pointerId);canvas.onwheel=e=>{e.preventDefault();if(ar)return;fov=Math.max(12,Math.min(110,fov*(e.deltaY>0?1.1:.9)));dirty=true;};
function el(tag,text,cls){const x=document.createElement(tag);if(text!==undefined)x.textContent=text;if(cls)x.className=cls;return x;}function button(text,fn,cls){const b=el('button',text,cls);b.onclick=fn;return b;}
function openSheet(title){$('sheetTitle').textContent=title;$('sheetBody').replaceChildren();if(!$('sheet').open)$('sheet').showModal();return $('sheetBody');}$('close').onclick=()=>$('sheet').close();
function selection(s){selected=s;const box=$('selection');box.hidden=false;$('hint').hidden=true;box.replaceChildren();let d=el('div');d.append(el('b',s.name),el('small',s.type+' · '+(s.alt>=0?'地平线上方 ':'地平线下方 ')+Math.abs(s.alt).toFixed(1)+'°'));box.append(d,button('探索 →',()=>details(s)));dirty=true;}
function focus(s){selection(s);if(!tracking){az=s.az;alt=Math.max(-85,Math.min(85,s.alt));fov=Math.min(fov,65);roll=0;}if($('sheet').open)$('sheet').close();if(s.alt<0)toast('此天体现在位于地平线下，实际天空不可见');dirty=true;}
function details(s){const b=openSheet(s.name);b.append(el('div',s.en+' / '+s.type,'tag'));b.append(el('p',descriptions[s.id]||('收录于 HYG 星表。所属星座：'+s.con+'。亮度以视星等表示，数值越小越明亮。星图已考虑岁差；恒星自行和大气折射未应用于恒星显示。'),'copy'));const m=el('div',undefined,'metrics');for(const [name,val] of [['方位角',s.az.toFixed(1)+'°'],['高度角',s.alt.toFixed(1)+'°'],['视星等',s.mag.toFixed(2)],['距离',s.color?(s.dist<.1?Math.round(s.dist*149597870.7).toLocaleString()+' km':s.dist.toFixed(2)+' AU'):(s.dist>=100000?'未知':(s.dist*3.26156).toFixed(1)+' 光年')]]){let d=el('div');d.append(el('small',name),el('b',val));m.append(d);}b.append(m);if(s.id==='Moon')b.append(el('p','月面照明比例 '+(s.phase*100).toFixed(1)+'%','copy'));
 if(s.color){let text=[];for(const [label,dir] of [['下次升起',1],['下次落下',-1]]){try{let t=A.SearchRiseSet(s.en,observer(),dir,now(),2);text.push(label+'：'+(t?fmt(t.date):'48 小时内无此事件'));}catch(e){text.push(label+'：暂不可计算');}}b.append(el('p',text.join(' / '),'copy'));}
 b.append(button(tracking?'引导我找到它':'在星图中定位',()=>focus(s),'primary'));const note=el('textarea');note.placeholder='记录你的观测、想法或纪念…';note.value=notes[s.id]||'';note.maxLength=2000;b.append(el('label','观测笔记（保存在本机）'),note,button(Object.prototype.hasOwnProperty.call(notes,s.id)?'更新收藏与笔记':'收藏并保存笔记',()=>{notes[s.id]=note.value;localStorage.setItem('notes',JSON.stringify(notes));toast('已保存到观测收藏');},'secondary'));if(Object.prototype.hasOwnProperty.call(notes,s.id))b.append(button('取消收藏',()=>{delete notes[s.id];localStorage.setItem('notes',JSON.stringify(notes));details(s);},'secondary'));
}
function listObjects(parent,objects){if(!objects.length){parent.append(el('p','暂无匹配天体。可以搜索中文亮星名、英文名或 HIP 编号。','copy'));return;}for(const s of objects){let r=el('div',undefined,'row'),d=el('div');d.append(el('b',s.name),el('small',(s.color?s.type:s.con+' · 恒星')+' · '+s.mag.toFixed(1)+' 等 · '+(s.alt>=0?'高度 ':'地平线下 ')+Math.abs(s.alt).toFixed(0)+'°'));r.append(d,button('查看',()=>details(s)));parent.append(r);}}
$('search').onclick=()=>{const b=openSheet('寻找一颗星'),input=el('input'),results=el('div');input.placeholder='中文 / English / HIP 编号';input.type='search';input.setAttribute('aria-label','搜索天体');b.append(input,results);const search=()=>{const q=input.value.trim().toLowerCase();results.replaceChildren();let result=q?catalog.filter(s=>(s.name+' '+s.en+' '+s.con+' HIP '+s.hip).toLowerCase().includes(q)):[...bodies,...stars.slice(0,20)];listObjects(results,result.slice(0,60));if(result.length>60)results.append(el('p','显示前 60 项，请输入更完整的名称。','copy'));};input.oninput=search;search();};
$('tonight').onclick=()=>{calculate();const b=openSheet('此刻可见');b.append(el('p',cfg.place+' · '+fmt(now())+'。以下天体位于地平线上方；实际可见性受太阳、云层与光污染影响。','copy'));if(bodies[0].alt> -6)b.append(el('p','当前天空较亮，大多数恒星肉眼不可见。切勿直视太阳。','copy'));listObjects(b,catalog.filter(s=>s.alt>5&&(s.color||s.mag<2)).sort((a,b)=>a.mag-b.mag).slice(0,45));};
$('saved').onclick=()=>{const b=openSheet('观测收藏');const actions=el('div',undefined,'backup-actions');actions.append(button('导出备份',exportBackup),button('导入备份',importBackup));b.append(actions);const objects=Object.keys(notes).map(id=>byId.get(id)).filter(Boolean);if(!objects.length)b.append(el('p','点击任意天体，在详情中保存收藏和观测笔记。记录保存在本机，可导出 JSON 备份并在其他设备导入。','copy'));else listObjects(b,objects);};
$('loc').onclick=()=>{const b=openSheet('你在哪里看星星？');b.append(el('p','位置决定天空中天体的方向。默认是北京示例位置，请设置你的实际位置。经纬度仅用于本机计算。','copy'));b.append(button('◎ 使用手机定位',()=>{if(window.NativeSky){NativeSky.locate();toast('正在获取位置，请确保系统定位已开启');$('sheet').close();}else toast('浏览器预览请手动填写位置');},'primary'));let lat=el('input'),lon=el('input');lat.type=lon.type='number';lat.step=lon.step='any';lat.value=cfg.lat;lon.value=cfg.lon;lat.min=-90;lat.max=90;lon.min=-180;lon.max=180;b.append(el('label','纬度（北纬为正，南纬为负）'),lat,el('label','经度（东经为正，西经为负）'),lon,button('保存位置',()=>{const la=Number(lat.value),lo=Number(lon.value);if(!lat.value.trim()||!lon.value.trim()||!Number.isFinite(la)||!Number.isFinite(lo)||Math.abs(la)>90||Math.abs(lo)>180){toast('请输入有效纬度 −90～90、经度 −180～180');return;}setPlace(la,lo,la.toFixed(2)+'°, '+lo.toFixed(2)+'°');$('sheet').close();},'primary'));};
$('earlier').onclick=()=>{if(ar)return;offset-=3600000;calculate();};$('later').onclick=()=>{if(ar)return;offset+=3600000;calculate();};$('time').onclick=()=>{if(ar)return;const b=openSheet('穿越时间');b.append(el('p','选择本地日期与时间，查看那一刻的天空。当前 '+fmt(now()),'copy'));const input=el('input');input.type='datetime-local';const date=now();input.value=new Date(date.getTime()-date.getTimezoneOffset()*60000).toISOString().slice(0,16);input.min='1900-01-01T00:00';input.max='2100-12-31T23:59';b.append(input,button('前往这一刻',()=>{const t=new Date(input.value);if(!input.value||!Number.isFinite(+t)||t.getFullYear()<1900||t.getFullYear()>2100){toast('请选择 1900～2100 年的有效时间');return;}offset=+t-Date.now();calculate();$('sheet').close();},'primary'),button('返回现在',()=>{offset=0;calculate();$('sheet').close();},'secondary'));};
$('help').onclick=()=>{const b=openSheet('把整个星空装进口袋');b.append(el('div','STARLIGHT 0.2 / 免费 · 离线 · 无广告','tag'));for(const text of ['拖动星图探索，双指缩放。点击右侧准星，手机背面指向天空。方向传感器需要真机支持，请远离磁性物品。','先设置位置。星图默认展示北京示例天空，未设置位置时不能用于当地识星。','搜索天体并定位；开启手机指向时会显示方向引导。地平线下方的天体以暗色显示，实际天空不可见。','此版本收录 15,598 颗 7 等及更亮的恒星，计算太阳、月亮与八个地外行星/矮行星。提供 8 组常见星座/星群连线。','这是独立开发的免费预览版，与 Night Sky 无隶属关系。相机 AR 为实验性的方向传感器叠加，尚不含空间识别、行星 AR 模型、卫星/ISS 追踪、云端十亿星库、AI、天气、光污染地图、空间音频或多人同步。手机性能、相机兼容性与方向精度尚待真机测试。','数据：HYG v4.1（David Nash / Astronexus，CC BY-SA 4.0，按星等筛选并转为 JSON）；天文计算：Astronomy Engine 2.1.19（Don Cross，MIT）。完整许可随源码提供。'])b.append(el('p',text,'copy'));};
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
$('calibrate').onclick=()=>{
 const b=openSheet('AR 手动校准');b.append(el('p','先确认位置，远离金属并校准指南针。再以已知天体为参照微调标记；这是视觉补偿，不会提高传感器本身精度。','copy'));
 for(const [key,label,min,max,step] of [['az','左右偏移（度）',-20,20,.5],['alt','上下偏移（度）',-20,20,.5],['scale','视场比例',.7,1.4,.02]]){
  const input=el('input'),labelNode=el('label',label+' '+calibration[key]);input.type='range';input.min=min;input.max=max;input.step=step;input.value=calibration[key];input.oninput=()=>{calibration[key]=Number(input.value);labelNode.textContent=label+' '+input.value;fov=Math.max(12,Math.min(110,cameraFov*calibration.scale));localStorage.setItem('calibration',JSON.stringify(calibration));dirty=true;};b.append(labelNode,input);
 }
 b.append(button('重置校准',()=>{calibration={az:0,alt:0,scale:1};localStorage.removeItem('calibration');fov=cameraFov;dirty=true;$('sheet').close();},'secondary'));
};
resize();sync();calculate();
