package com.chargealert.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import java.lang.reflect.Method;

public class BootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null) return;
        String action = intent.getAction();
        if (Intent.ACTION_BOOT_COMPLETED.equals(action) || "android.intent.action.QUICKBOOT_POWERON".equals(action)) {
            SharedPreferences prefs = context.getSharedPreferences("ChargeAlertPrefs", Context.MODE_PRIVATE);
            boolean bootEnabled = prefs.getBoolean("opt_boot", true);
            if (bootEnabled) {
                Intent serviceIntent = new Intent(context, ChargeService.class);
                if (Build.VERSION.SDK_INT >= 26) {
                    try {
                        Method m = Context.class.getMethod("startForegroundService", Intent.class);
                        m.invoke(context, serviceIntent);
                        return;
                    } catch (Exception ignored) {}
                }
                context.startService(serviceIntent);
            }
        }
    }
}
