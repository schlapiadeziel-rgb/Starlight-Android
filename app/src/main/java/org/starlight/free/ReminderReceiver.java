package org.starlight.free;
import android.content.*;
public final class ReminderReceiver extends BroadcastReceiver {
    @Override public void onReceive(Context c,Intent i){String action=i.getAction();if(ReminderManager.ACTION.equals(action))ReminderManager.deliver(c,i.getIntExtra("reminder_id",-1));else if(Intent.ACTION_BOOT_COMPLETED.equals(action)||Intent.ACTION_MY_PACKAGE_REPLACED.equals(action)||Intent.ACTION_TIME_CHANGED.equals(action))ReminderManager.restore(c);}
}
