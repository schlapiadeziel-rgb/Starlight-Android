'use strict';
let reminderEditor=null,reminderSequence=0;
const reminderDate=t=>new Date(t).toLocaleString('zh-CN',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false});
function reminderSupported(){return !!window.NativeSky&&typeof NativeSky.getReminders==='function'&&typeof NativeSky.scheduleReminder==='function';}
function showReminderEditor(s,time=+now(),name=s.name){
 const b=openSheet('设置观测提醒'),date=el('input'),lead=el('select'),status=el('p',undefined,'copy'),actual=Date.now(),past=time<actual+60000;
 date.type='datetime-local';date.id='reminderTime';date.value=SkyReminders.localInput(past?actual+1800000:time);date.setAttribute('aria-label','观测日期与时间');
 lead.id='reminderLead';lead.setAttribute('aria-label','提前提醒');for(const minutes of [0,10,30,60]){const option=el('option',minutes?'提前 '+minutes+' 分钟':'观测时刻');option.value=String(minutes);lead.append(option);}lead.value='10';
 const location={lat:cfg.lat,lon:cfg.lon,place:cfg.place},token=++reminderSequence;
 b.append(el('div',name,'tag'),el('p','提醒地点：'+location.place+'（'+location.lat.toFixed(2)+'°, '+location.lon.toFixed(2)+'°）','copy'));
 if(past)b.append(el('p','所选时间已过或太近，已预填 30 分钟后；请确认观测时刻。','copy'));
 if(location.place.includes('示例'))b.append(el('p','当前为示例位置，请先设置实际观测地点。','copy'));
 b.append(el('label','观测日期与时间（手机本地时区）'),date,el('label','提前提醒'),lead,el('p','本机通知，无需联网。系统省电可能延后投递；重启后会恢复待提醒。超过观测时刻一小时不再发出通知。','copy'),status);
 const save=button('保存提醒',()=>{try{const record=SkyReminders.request({target:s.id,name,time:SkyReminders.parseInput(date.value),lead:Number(lead.value),...location});save.disabled=true;status.textContent='正在保存；如系统请求通知权限，请选择是否允许。';NativeSky.scheduleReminder(JSON.stringify(record),token);}catch(e){save.disabled=false;status.textContent=e.message;}},'primary');
 save.disabled=!reminderSupported()||location.place.includes('示例');if(!reminderSupported())status.textContent='观测提醒需在安卓 App 中使用。';
 b.append(save,button('查看已有提醒',showReminders,'secondary'));reminderEditor={token,status,save};sheetCleanup=()=>{if(reminderEditor?.token===token)reminderEditor=null;};
}
function nativeReminderResult(token,ok,message){
 if(reminderEditor?.token===token&&reminderEditor.status.isConnected){reminderEditor.save.disabled=false;reminderEditor.status.textContent=String(message);if(ok){showReminders();toast(String(message));}}
 else if(ok)toast(String(message));
}
function showReminders(){
 const b=openSheet('观测提醒');if(!reminderSupported()){b.append(el('p','请在安卓 App 中设置和管理本机通知。','copy'));return;}
 const snapshot=SkyReminders.snapshot(NativeSky.getReminders());if(!snapshot){b.append(el('p','提醒列表读取失败，请重新打开。','copy'));return;}
 b.append(el('p',snapshot.enabled?'本机通知已开启 · 最多 16 个待提醒':'通知或观测提醒频道已关闭；现有待提醒可能无法显示通知。','copy'),button('系统通知设置',()=>NativeSky.openReminderSettings(),'secondary'),el('p','可以从天体资料、观测计划或月相日历添加。时间与地点在创建时保存；删除待提醒会取消对应通知。','copy'));
 if(!snapshot.items.length)b.append(el('p','还没有观测提醒。','copy'));
 for(const record of snapshot.items){const card=el('div',undefined,'planner-card');card.dataset.reminder=String(record.id);const label=['待提醒','已发出','未投递／已错过','通知不可用 · 未发出'][record.state];card.append(el('b',record.name+' · '+label),el('p',reminderDate(record.time)+' · '+record.place+(record.lead?' · 提前 '+record.lead+' 分钟':''),'copy'),button('查看保存的观测时刻',()=>showReminderRecord(record),'secondary'),button(record.state===0?'取消提醒':'删除记录',()=>NativeSky.cancelReminder(record.id),'secondary'));b.append(card);}
}
function nativeRemindersChanged(){if($('sheet').open&&$('sheetTitle').textContent==='观测提醒')showReminders();}
function showReminderRecord(record){
 if(!SkyReminders.valid(record)||!byId.has(record.target)){toast('提醒资料不可用');return;}
 const b=openSheet('提醒详情');b.append(el('div',record.name,'tag'),el('p',reminderDate(record.time)+' · '+record.place+'（'+record.lat.toFixed(2)+'°, '+record.lon.toFixed(2)+'°）','copy'),el('p','查看时会切换到保存的地点和时刻；这不会重新设置通知。','copy'),button('按保存地点查看星图',()=>{stopTrack();if(window.NativeSky?.stopLocation)NativeSky.stopLocation();setPlace(record.lat,record.lon,record.place);offset=record.time-Date.now();calculate();focus(byId.get(record.target));},'primary'),button('返回提醒列表',showReminders,'secondary'));
}
function nativeOpenReminder(raw){try{const record=typeof raw==='string'?JSON.parse(raw):raw;showReminderRecord(record);}catch(e){toast('提醒资料不可用');}}
