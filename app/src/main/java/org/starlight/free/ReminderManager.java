package org.starlight.free;
import android.app.*;
import android.content.*;
import org.json.*;
import java.text.SimpleDateFormat;
import java.util.*;

/** Local one-shot notifications. No exact-alarm permission or running service. */
public final class ReminderManager {
    static final String CHANNEL="observations",ACTION="org.starlight.free.OBSERVATION";
    private static SharedPreferences prefs(Context c){return c.getSharedPreferences("observation-reminders",Context.MODE_PRIVATE);}
    private static JSONArray read(Context c){try{return new JSONArray(prefs(c).getString("items","[]"));}catch(Exception e){return new JSONArray();}}
    private static void write(Context c,JSONArray a,int next){if(!prefs(c).edit().putString("items",a.toString()).putInt("next",next).commit())throw new IllegalStateException("提醒无法保存，请检查可用空间");}
    private static void write(Context c,JSONArray a){write(c,a,prefs(c).getInt("next",1));}
    public static void channel(Context c){NotificationManager n=c.getSystemService(NotificationManager.class);if(n!=null){NotificationChannel ch=new NotificationChannel(CHANNEL,"观测提醒",NotificationManager.IMPORTANCE_DEFAULT);ch.setDescription("你设置的天体与月相观测提醒");n.createNotificationChannel(ch);}}
    public static boolean enabled(Context c){channel(c);NotificationManager n=c.getSystemService(NotificationManager.class);return n!=null&&n.areNotificationsEnabled()&&n.getNotificationChannel(CHANNEL).getImportance()!=NotificationManager.IMPORTANCE_NONE;}
    public static JSONObject validate(String data)throws JSONException {
        if(data==null||data.length()>4096)throw new IllegalArgumentException("提醒资料无效");JSONObject j=new JSONObject(data);
        for(String key:new String[]{"time","lead","lat","lon"})if(!(j.get(key) instanceof Number))throw new IllegalArgumentException("提醒数字无效");
        for(String key:new String[]{"name","place"}){Object v=j.get(key);if(!(v instanceof String)||((String)v).trim().isEmpty()||((String)v).length()>80||((String)v).matches("(?s).*\\p{Cntrl}.*"))throw new IllegalArgumentException("提醒文字无效");}
        if(!(j.get("target") instanceof String)||!j.getString("target").matches("[A-Za-z0-9_-]{1,40}"))throw new IllegalArgumentException("提醒天体无效");
        double time=j.getDouble("time"),lead=j.getDouble("lead"),lat=j.getDouble("lat"),lon=j.getDouble("lon");
        if(time!=Math.rint(time)||(lead!=0&&lead!=10&&lead!=30&&lead!=60)||!Double.isFinite(lat)||!Double.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180)throw new IllegalArgumentException("提醒时刻或位置无效");
        ReminderPolicy.trigger(j.getLong("time"),j.getInt("lead"));
        JSONObject clean=new JSONObject();for(String key:new String[]{"target","name","time","lead","lat","lon","place"})clean.put(key,j.get(key));return clean;
    }
    private static PendingIntent pending(Context c,int id,int flags){return PendingIntent.getBroadcast(c,id,new Intent(c,ReminderReceiver.class).setAction(ACTION).putExtra("reminder_id",id),flags|PendingIntent.FLAG_IMMUTABLE);}
    private static void schedule(Context c,JSONObject j)throws JSONException {
        AlarmManager a=c.getSystemService(AlarmManager.class);if(a==null)throw new IllegalStateException("系统提醒服务不可用");
        a.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,Math.max(System.currentTimeMillis()+1000,ReminderPolicy.trigger(j.getLong("time"),j.getInt("lead"))),pending(c,j.getInt("id"),PendingIntent.FLAG_UPDATE_CURRENT));
    }
    private static void cancel(Context c,int id){PendingIntent p=pending(c,id,PendingIntent.FLAG_NO_CREATE);AlarmManager a=c.getSystemService(AlarmManager.class);if(p!=null){if(a!=null)a.cancel(p);p.cancel();}NotificationManager n=c.getSystemService(NotificationManager.class);if(n!=null)n.cancel(id);}
    public static synchronized void add(Context c,JSONObject input)throws JSONException {
        JSONObject j=validate(input.toString());ReminderPolicy.future(j.getLong("time"),j.getInt("lead"),System.currentTimeMillis());
        if(!enabled(c))throw new IllegalStateException("系统通知或观测提醒频道已关闭，请先开启");
        JSONArray old=read(c),next=new JSONArray();int count=0,id=prefs(c).getInt("next",1);
        for(int i=0;i<old.length();i++){JSONObject item=old.getJSONObject(i);if(item.optInt("state")==0){count++;if(item.getString("target").equals(j.getString("target"))&&item.getLong("time")==j.getLong("time")&&item.getDouble("lat")==j.getDouble("lat")&&item.getDouble("lon")==j.getDouble("lon"))throw new IllegalArgumentException("此天体、时刻和地点已有提醒，请先取消后重设");}
            if(item.optInt("state")==0||i>=old.length()-32)next.put(item);}
        if(count>=16)throw new IllegalStateException("最多 16 个待提醒，请先取消一项");
        if(id<=0||id==Integer.MAX_VALUE)throw new IllegalStateException("提醒编号已满");
        j.put("id",id).put("state",0);next.put(j);
        try{write(c,next,id+1);schedule(c,j);}catch(RuntimeException e){try{write(c,old,id+1);}finally{cancel(c,id);}throw e;}
    }
    public static synchronized String snapshot(Context c){try{return new JSONObject().put("enabled",enabled(c)).put("items",read(c)).toString();}catch(Exception e){return "{\"enabled\":false,\"items\":[]}";}}
    public static synchronized JSONObject find(Context c,int id){JSONArray a=read(c);for(int i=0;i<a.length();i++){JSONObject j=a.optJSONObject(i);if(j!=null&&j.optInt("id")==id)return j;}return null;}
    public static synchronized void remove(Context c,int id)throws JSONException {JSONArray a=read(c),next=new JSONArray();for(int i=0;i<a.length();i++){JSONObject j=a.getJSONObject(i);if(j.getInt("id")!=id)next.put(j);}write(c,next);cancel(c,id);}
    public static synchronized void restore(Context c){JSONArray a=read(c);boolean changed=false;for(int i=0;i<a.length();i++)try{JSONObject j=a.getJSONObject(i);if(j.optInt("state")!=0)continue;validate(j.toString());if(ReminderPolicy.delivery(j.getLong("time"),j.getInt("lead"),System.currentTimeMillis())==2){j.put("state",2);cancel(c,j.getInt("id"));changed=true;}else schedule(c,j);}catch(Exception e){try{a.getJSONObject(i).put("state",2);changed=true;}catch(Exception ignored){}}if(changed)try{write(c,a);}catch(Exception ignored){}}
    public static synchronized void deliver(Context c,int id){JSONArray a=read(c);for(int i=0;i<a.length();i++)try{
        JSONObject j=a.getJSONObject(i);if(j.getInt("id")!=id||j.optInt("state")!=0)continue;
        int state=ReminderPolicy.delivery(j.getLong("time"),j.getInt("lead"),System.currentTimeMillis());if(state==0){schedule(c,j);return;}if(state==1&&!enabled(c))state=3;
        if(state==1){Intent open=new Intent(c,MainActivity.class).putExtra("reminder_id",id).addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP|Intent.FLAG_ACTIVITY_SINGLE_TOP);PendingIntent tap=PendingIntent.getActivity(c,id,open,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
            String date=new SimpleDateFormat("MM/dd HH:mm",Locale.CHINA).format(new Date(j.getLong("time"))),text=date+" · "+j.getString("place")+(System.currentTimeMillis()>j.getLong("time")?" · 观测时刻已过":" · 点击查看保存的观测时刻");
            Notification n=new Notification.Builder(c,CHANNEL).setSmallIcon(R.drawable.notification_star).setContentTitle("观测提醒 · "+j.getString("name")).setContentText(text).setStyle(new Notification.BigTextStyle().bigText(text)).setContentIntent(tap).setAutoCancel(true).setOnlyAlertOnce(true).setVisibility(Notification.VISIBILITY_PRIVATE).build();
            try{c.getSystemService(NotificationManager.class).notify(id,n);}catch(RuntimeException e){state=3;}
        }j.put("state",state);write(c,a);return;
    }catch(Exception ignored){}}
    private ReminderManager(){}
}
