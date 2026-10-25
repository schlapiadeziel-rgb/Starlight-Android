package org.starlight.free;
public final class ReminderPolicyTest {
    static int checks=0;
    static void check(boolean x){if(!x)throw new AssertionError();checks++;}
    static void rejected(Runnable r){boolean bad=false;try{r.run();}catch(IllegalArgumentException e){bad=true;}check(bad);}
    public static void main(String[] args){long now=1791979200000L;
        for(int lead:new int[]{0,10,30,60}){long event=now+(lead+1)*60000L;ReminderPolicy.future(event,lead,now);check(ReminderPolicy.trigger(event,lead)==now+60000);rejected(()->ReminderPolicy.future(event-1,lead,now));check(ReminderPolicy.delivery(event,lead,now)==0);check(ReminderPolicy.delivery(event,lead,event)==1);check(ReminderPolicy.delivery(event,lead,event+3600000)==1);check(ReminderPolicy.delivery(event,lead,event+3600001)==2);}
        rejected(()->ReminderPolicy.trigger(now,5));rejected(()->ReminderPolicy.trigger(-1,0));rejected(()->ReminderPolicy.trigger(Long.MAX_VALUE,0));rejected(()->ReminderPolicy.future(now+ReminderPolicy.YEAR+1,0,now));ReminderPolicy.future(now+ReminderPolicy.YEAR,0,now);check(true);
        System.out.println("PASS: "+checks+" reminder timing boundaries, one-year limit, clock rollback and expired-delivery rules.");
    }
}
