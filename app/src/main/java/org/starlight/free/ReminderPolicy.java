package org.starlight.free;
/** Time rules are independent of Android so boundaries can be tested. */
public final class ReminderPolicy {
    public static final long MINUTE=60000L,YEAR=365L*24*60*MINUTE;
    public static long trigger(long time,int lead){
        if(time<=0||time>4102444800000L||!(lead==0||lead==10||lead==30||lead==60))throw new IllegalArgumentException("提醒时间或提前量无效");
        return time-lead*MINUTE;
    }
    public static void future(long time,int lead,long now){
        if(trigger(time,lead)<now+MINUTE)throw new IllegalArgumentException("提醒须在一分钟后，请调整时刻或提前量");
        if(time>now+YEAR)throw new IllegalArgumentException("请选择未来一年内的时刻");
    }
    public static int delivery(long time,int lead,long now){
        return now<trigger(time,lead)?0:now>time+60*MINUTE?2:1;
    }
    private ReminderPolicy(){}
}
