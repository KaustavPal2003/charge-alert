package com.chargealert.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.media.AudioAttributes;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.media.Ringtone;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.BatteryManager;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import android.os.Vibrator;
import java.lang.reflect.Constructor;
import java.lang.reflect.Method;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.HashSet;
import java.util.Locale;
import java.util.Set;

public class ChargeService extends Service {
    public static final String ACTION_STOP_SERVICE = "com.chargealert.app.ACTION_STOP";
    public static final String ACTION_DISMISS_ALARM = "com.chargealert.app.ACTION_DISMISS_ALARM";
    public static final String CHANNEL_ID_MONITOR = "charge_alert_monitor_v4";
    public static final String CHANNEL_ID_ALARM = "charge_alert_alarm_v4";
    public static final int NOTIF_ID_MONITOR = 1001;
    public static final int NOTIF_ID_ALARM = 1002;

    private static boolean isServiceRunning = false;
    private BroadcastReceiver batteryReceiver;
    private final Set<Integer> triggeredThresholds = new HashSet<Integer>();
    private MediaPlayer mediaPlayer;
    private Ringtone fallbackRingtone;
    private PowerManager.WakeLock alarmWakeLock;
    private PowerManager.WakeLock monitorWakeLock;
    private boolean isAlarmActive = false;
    private boolean isCurrentlyPlugged = false;

    private final Handler pollHandler = new Handler(Looper.getMainLooper());
    private final Runnable pollRunnable = new Runnable() {
        @Override
        public void run() {
            if (isCurrentlyPlugged) {
                pollBatteryDirectly();
            }
            // Poll every 25 seconds while service is running
            pollHandler.postDelayed(this, 25000);
        }
    };

    public static boolean isRunning() {
        return isServiceRunning;
    }

    @Override
    public void onCreate() {
        super.onCreate();
        isServiceRunning = true;
        createNotificationChannels();
        registerBatteryReceiver();
        // Start active hardware polling
        pollHandler.postDelayed(pollRunnable, 5000);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null) {
            String action = intent.getAction();
            if (ACTION_STOP_SERVICE.equals(action)) {
                stopAlarm();
                stopForeground(true);
                stopSelf();
                return START_NOT_STICKY;
            } else if (ACTION_DISMISS_ALARM.equals(action)) {
                stopAlarm();
                NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
                if (nm != null) {
                    nm.cancel(NOTIF_ID_ALARM);
                }
                return START_STICKY;
            }
        }

        Notification initialNotif = buildMonitorNotification(0, false);
        if (Build.VERSION.SDK_INT >= 29) {
            try {
                Method m = Service.class.getMethod("startForeground", int.class, Notification.class, int.class);
                m.invoke(this, NOTIF_ID_MONITOR, initialNotif, 0x40000000 /* FOREGROUND_SERVICE_TYPE_SPECIAL_USE */);
                return START_STICKY;
            } catch (Exception ignored) {}
        }
        startForeground(NOTIF_ID_MONITOR, initialNotif);
        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        isServiceRunning = false;
        pollHandler.removeCallbacks(pollRunnable);
        stopAlarm();
        releaseMonitorWakeLock();
        if (batteryReceiver != null) {
            try {
                unregisterReceiver(batteryReceiver);
            } catch (Exception ignored) {}
            batteryReceiver = null;
        }
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    private void registerBatteryReceiver() {
        IntentFilter filter = new IntentFilter();
        filter.addAction(Intent.ACTION_BATTERY_CHANGED);
        filter.addAction(Intent.ACTION_POWER_CONNECTED);
        filter.addAction(Intent.ACTION_POWER_DISCONNECTED);

        batteryReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                if (intent == null) return;
                String action = intent.getAction();

                if (Intent.ACTION_POWER_DISCONNECTED.equals(action)) {
                    // Charger unplugged -> stop alarm, release charging wake lock, reset session
                    isCurrentlyPlugged = false;
                    releaseMonitorWakeLock();
                    triggeredThresholds.clear();
                    stopAlarm();
                    NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
                    if (nm != null) {
                        nm.cancel(NOTIF_ID_ALARM);
                    }
                    updateMonitorNotification(0, false);
                    return;
                }

                if (Intent.ACTION_POWER_CONNECTED.equals(action)) {
                    isCurrentlyPlugged = true;
                    acquireMonitorWakeLock();
                    triggeredThresholds.clear();
                    stopAlarm();
                }

                if (Intent.ACTION_BATTERY_CHANGED.equals(action)) {
                    int level = intent.getIntExtra(BatteryManager.EXTRA_LEVEL, -1);
                    int scale = intent.getIntExtra(BatteryManager.EXTRA_SCALE, -1);
                    int status = intent.getIntExtra(BatteryManager.EXTRA_STATUS, -1);
                    int plugged = intent.getIntExtra(BatteryManager.EXTRA_PLUGGED, -1);

                    int pct = (scale > 0) ? (level * 100 / scale) : level;

                    // Physical connection detection: AC, USB, Wireless
                    boolean isPlugged = (plugged == BatteryManager.BATTERY_PLUGGED_AC ||
                                         plugged == BatteryManager.BATTERY_PLUGGED_USB ||
                                         plugged == 4 /* WIRELESS */ ||
                                         plugged > 0 ||
                                         status == BatteryManager.BATTERY_STATUS_CHARGING);

                    isCurrentlyPlugged = isPlugged;
                    if (isPlugged) {
                        acquireMonitorWakeLock();
                    } else {
                        releaseMonitorWakeLock();
                    }

                    updateMonitorNotification(pct, isPlugged);

                    if (isPlugged && pct > 0) {
                        checkThresholds(pct);
                    } else if (!isPlugged) {
                        triggeredThresholds.clear();
                    }
                }
            }
        };

        // For system broadcasts in Android 13/14, use RECEIVER_EXPORTED (flag 2)
        if (Build.VERSION.SDK_INT >= 33) {
            try {
                Method m = Context.class.getMethod("registerReceiver", BroadcastReceiver.class, IntentFilter.class, int.class);
                m.invoke(this, batteryReceiver, filter, 2 /* RECEIVER_EXPORTED for system broadcast */);
                return;
            } catch (Exception ignored) {}
        }
        registerReceiver(batteryReceiver, filter);
    }

    /**
     * Active hardware poll directly from Linux kernel power_supply sysfs via BatteryManager
     * Bypasses OS broadcast throttling and Doze mode sleep
     */
    private void pollBatteryDirectly() {
        try {
            // 1. Check synchronous sticky battery intent
            Intent stickyIntent = registerReceiver(null, new IntentFilter(Intent.ACTION_BATTERY_CHANGED));
            int pct = -1;
            boolean isPlugged = false;

            if (stickyIntent != null) {
                int level = stickyIntent.getIntExtra(BatteryManager.EXTRA_LEVEL, -1);
                int scale = stickyIntent.getIntExtra(BatteryManager.EXTRA_SCALE, -1);
                int plugged = stickyIntent.getIntExtra(BatteryManager.EXTRA_PLUGGED, -1);
                int status = stickyIntent.getIntExtra(BatteryManager.EXTRA_STATUS, -1);
                if (scale > 0) {
                    pct = (level * 100 / scale);
                }
                isPlugged = (plugged > 0 || status == BatteryManager.BATTERY_STATUS_CHARGING);
            }

            // 2. Fallback to direct BatteryManager hardware properties
            if (pct <= 0) {
                BatteryManager bm = (BatteryManager) getSystemService(Context.BATTERY_SERVICE);
                if (bm != null) {
                    pct = bm.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY);
                    if (Build.VERSION.SDK_INT >= 23) {
                        isPlugged = bm.isCharging();
                    }
                }
            }

            if (pct > 0) {
                isCurrentlyPlugged = isPlugged;
                updateMonitorNotification(pct, isPlugged);
                if (isPlugged) {
                    checkThresholds(pct);
                }
            }
        } catch (Exception ignored) {}
    }

    private void checkThresholds(int currentPct) {
        SharedPreferences sp = getSharedPreferences("ChargeAlertPrefs", MODE_PRIVATE);
        int[] availableThresholds = new int[]{70, 75, 80, 85, 90, 95, 100};

        for (int t : availableThresholds) {
            boolean enabled = sp.getBoolean("thresh_" + t, (t == 80 || t == 100));
            // Trigger alarm if enabled, current percentage reaches or exceeds threshold, and not yet fired in this plug session
            if (enabled && currentPct >= t && !triggeredThresholds.contains(t)) {
                triggeredThresholds.add(t);
                fireAlert(currentPct, t);
                break;
            }
        }
    }

    private void fireAlert(int currentPct, int threshold) {
        SharedPreferences sp = getSharedPreferences("ChargeAlertPrefs", MODE_PRIVATE);
        boolean soundEnabled = sp.getBoolean("opt_sound", true);
        boolean vibrateEnabled = sp.getBoolean("opt_vibrate", true);

        // Keep CPU awake while alarm sounds (even if phone screen is locked)
        acquireAlarmWakeLock();

        isAlarmActive = true;

        String timeStr = new SimpleDateFormat("h:mm a", Locale.getDefault()).format(new Date());
        sp.edit()
          .putInt("last_alert_threshold", threshold)
          .putInt("last_alert_battery_pct", currentPct)
          .putString("last_alert_time", timeStr)
          .apply();

        if (soundEnabled) {
            startAlarmSound();
        }

        if (vibrateEnabled) {
            startVibration();
        }

        showAlarmNotification(currentPct, threshold);
    }

    private Uri getAlarmSoundUri() {
        SharedPreferences sp = getSharedPreferences("ChargeAlertPrefs", MODE_PRIVATE);
        String customUriStr = sp.getString("custom_tone_uri", null);
        if (customUriStr != null && !customUriStr.isEmpty()) {
            try {
                return Uri.parse(customUriStr);
            } catch (Exception ignored) {}
        }

        // Try alarm sound first (loudest and most reliable for waking up user)
        Uri uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
        if (uri == null) {
            uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
        }
        if (uri == null) {
            uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE);
        }
        return uri;
    }

    private void startAlarmSound() {
        stopSoundOnly();
        try {
            Uri soundUri = getAlarmSoundUri();
            mediaPlayer = new MediaPlayer();
            mediaPlayer.setDataSource(getApplicationContext(), soundUri);

            // Set to ALARM stream so it sounds even if phone is on Silent/Vibrate!
            if (Build.VERSION.SDK_INT >= 21) {
                AudioAttributes attrs = new AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_ALARM)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .setLegacyStreamType(AudioManager.STREAM_ALARM)
                        .build();
                mediaPlayer.setAudioAttributes(attrs);
            } else {
                mediaPlayer.setAudioStreamType(AudioManager.STREAM_ALARM);
            }

            mediaPlayer.setLooping(true); // Loop alarm until user dismisses or unplugs!
            mediaPlayer.prepare();
            mediaPlayer.start();
        } catch (Exception e) {
            e.printStackTrace();
            // Fallback to RingtoneManager if MediaPlayer fails
            try {
                Uri soundUri = getAlarmSoundUri();
                fallbackRingtone = RingtoneManager.getRingtone(getApplicationContext(), soundUri);
                if (fallbackRingtone != null) {
                    if (Build.VERSION.SDK_INT >= 21) {
                        try {
                            AudioAttributes attrs = new AudioAttributes.Builder()
                                    .setUsage(AudioAttributes.USAGE_ALARM)
                                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                                    .build();
                            Method setAudioAttributes = Ringtone.class.getMethod("setAudioAttributes", AudioAttributes.class);
                            setAudioAttributes.invoke(fallbackRingtone, attrs);
                        } catch (Exception ignored) {}
                    }
                    fallbackRingtone.play();
                }
            } catch (Exception ignored) {}
        }
    }

    private void startVibration() {
        try {
            Vibrator v = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
            if (v != null && v.hasVibrator()) {
                // Repeating vibration pattern while alarm is active
                long[] pattern = new long[]{0, 600, 300, 600, 300, 1000};
                v.vibrate(pattern, 1 /* Repeat from index 1 */);
            }
        } catch (Exception ignored) {}
    }

    private void stopSoundOnly() {
        try {
            if (mediaPlayer != null) {
                if (mediaPlayer.isPlaying()) {
                    mediaPlayer.stop();
                }
                mediaPlayer.release();
                mediaPlayer = null;
            }
        } catch (Exception ignored) {}

        try {
            if (fallbackRingtone != null && fallbackRingtone.isPlaying()) {
                fallbackRingtone.stop();
            }
            fallbackRingtone = null;
        } catch (Exception ignored) {}
    }

    private void stopVibrationOnly() {
        try {
            Vibrator v = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
            if (v != null) {
                v.cancel();
            }
        } catch (Exception ignored) {}
    }

    public void stopAlarm() {
        isAlarmActive = false;
        stopSoundOnly();
        stopVibrationOnly();
        releaseAlarmWakeLock();
    }

    /**
     * Partial wake lock held ONLY while plugged into charger.
     * Prevents CPU from going into deep sleep during fast/normal charging.
     * Consumes 0 battery because phone is actively powered by wall/USB charger.
     */
    private void acquireMonitorWakeLock() {
        try {
            if (monitorWakeLock == null) {
                PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
                if (pm != null) {
                    monitorWakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "chargealert:charging_monitor");
                    monitorWakeLock.setReferenceCounted(false);
                }
            }
            if (monitorWakeLock != null && !monitorWakeLock.isHeld()) {
                monitorWakeLock.acquire(14400000); // 4 hours safety limit
            }
        } catch (Exception ignored) {}
    }

    private void releaseMonitorWakeLock() {
        try {
            if (monitorWakeLock != null && monitorWakeLock.isHeld()) {
                monitorWakeLock.release();
            }
        } catch (Exception ignored) {}
    }

    private void acquireAlarmWakeLock() {
        try {
            if (alarmWakeLock == null) {
                PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
                if (pm != null) {
                    alarmWakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK | 0x10000000 /* ACQUIRE_CAUSES_WAKEUP */, "chargealert:alert_wake");
                }
            }
            if (alarmWakeLock != null && !alarmWakeLock.isHeld()) {
                alarmWakeLock.acquire(180000); // 3 minutes timeout safety
            }
        } catch (Exception ignored) {}
    }

    private void releaseAlarmWakeLock() {
        try {
            if (alarmWakeLock != null && alarmWakeLock.isHeld()) {
                alarmWakeLock.release();
            }
        } catch (Exception ignored) {}
    }

    private void updateMonitorNotification(int pct, boolean isPlugged) {
        Notification n = buildMonitorNotification(pct, isPlugged);
        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null) {
            nm.notify(NOTIF_ID_MONITOR, n);
        }
    }

    private Notification buildMonitorNotification(int pct, boolean isPlugged) {
        String title = "Charge Alert Active";
        String text = isPlugged
                ? ("Charging: " + (pct > 0 ? (pct + "%") : "active") + " • Guard armed (80% / 100%)")
                : ("Unplugged • Connect charger to monitor (" + (pct > 0 ? (pct + "%") : "") + ")");

        Intent openIntent = new Intent(this, MainActivity.class);
        PendingIntent pOpen = PendingIntent.getActivity(this, 0, openIntent,
                Build.VERSION.SDK_INT >= 23 ? (PendingIntent.FLAG_UPDATE_CURRENT | 0x04000000 /* FLAG_IMMUTABLE */) : PendingIntent.FLAG_UPDATE_CURRENT);

        Intent stopIntent = new Intent(this, ChargeService.class);
        stopIntent.setAction(ACTION_STOP_SERVICE);
        PendingIntent pStop = PendingIntent.getService(this, 1, stopIntent,
                Build.VERSION.SDK_INT >= 23 ? (PendingIntent.FLAG_UPDATE_CURRENT | 0x04000000 /* FLAG_IMMUTABLE */) : PendingIntent.FLAG_UPDATE_CURRENT);

        Notification.Builder b = createNotificationBuilder(CHANNEL_ID_MONITOR);
        b.setContentTitle(title)
         .setContentText(text)
         .setSmallIcon(R.drawable.ic_launcher)
         .setContentIntent(pOpen)
         .setOngoing(true)
         .addAction(android.R.drawable.ic_menu_close_clear_cancel, "Stop Service", pStop);

        return b.build();
    }

    private void showAlarmNotification(int currentPct, int threshold) {
        Intent dismissIntent = new Intent(this, ChargeService.class);
        dismissIntent.setAction(ACTION_DISMISS_ALARM);
        PendingIntent pDismiss = PendingIntent.getService(this, 2, dismissIntent,
                Build.VERSION.SDK_INT >= 23 ? (PendingIntent.FLAG_UPDATE_CURRENT | 0x04000000 /* FLAG_IMMUTABLE */) : PendingIntent.FLAG_UPDATE_CURRENT);

        Intent openIntent = new Intent(this, MainActivity.class);
        PendingIntent pOpen = PendingIntent.getActivity(this, 3, openIntent,
                Build.VERSION.SDK_INT >= 23 ? (PendingIntent.FLAG_UPDATE_CURRENT | 0x04000000 /* FLAG_IMMUTABLE */) : PendingIntent.FLAG_UPDATE_CURRENT);

        Notification.Builder b = createNotificationBuilder(CHANNEL_ID_ALARM);
        b.setContentTitle("TARGET REACHED: " + threshold + "%!")
         .setContentText("Target charge of " + threshold + "% reached (Battery: " + currentPct + "%). Unplug charger now.")
         .setSmallIcon(R.drawable.ic_launcher)
         .setContentIntent(pOpen)
         .setAutoCancel(false)
         .setOngoing(true)
         .addAction(android.R.drawable.ic_menu_close_clear_cancel, "DISMISS ALARM", pDismiss);

        Uri toneUri = getAlarmSoundUri();
        if (toneUri != null) {
            b.setSound(toneUri);
        }

        if (Build.VERSION.SDK_INT >= 21) {
            b.setPriority(Notification.PRIORITY_MAX);
            b.setCategory(Notification.CATEGORY_ALARM);
            b.setVibrate(new long[]{0, 500, 300, 500});
        }

        Notification n = b.build();
        n.flags |= Notification.FLAG_INSISTENT; // Repeats audio until dismissed!

        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null) {
            nm.notify(NOTIF_ID_ALARM, n);
        }
    }

    private Notification.Builder createNotificationBuilder(String channelId) {
        if (Build.VERSION.SDK_INT >= 26) {
            try {
                Constructor<Notification.Builder> c = Notification.Builder.class.getConstructor(Context.class, String.class);
                return c.newInstance(this, channelId);
            } catch (Exception ignored) {}
        }
        return new Notification.Builder(this);
    }

    private void createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= 26) {
            try {
                Class<?> channelClass = Class.forName("android.app.NotificationChannel");
                Constructor<?> c = channelClass.getConstructor(String.class, CharSequence.class, int.class);

                // Monitoring Service Channel (Low importance, silent)
                Object monChannel = c.newInstance(CHANNEL_ID_MONITOR, "Monitoring Service", 2 /* IMPORTANCE_LOW */);
                Method setSound = channelClass.getMethod("setSound", Uri.class, AudioAttributes.class);
                setSound.invoke(monChannel, null, null);

                // High Priority Alarm Channel (Max importance, bypasses DND)
                Object alarmChannel = c.newInstance(CHANNEL_ID_ALARM, "Charge Alarms", 4 /* IMPORTANCE_HIGH */);

                Uri toneUri = getAlarmSoundUri();
                AudioAttributes attrs = new AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_ALARM)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .build();
                setSound.invoke(alarmChannel, toneUri, attrs);

                Method enableVibration = channelClass.getMethod("enableVibration", boolean.class);
                enableVibration.invoke(alarmChannel, true);

                Method setVibrationPattern = channelClass.getMethod("setVibrationPattern", long[].class);
                setVibrationPattern.invoke(alarmChannel, new long[]{0, 600, 300, 600});

                NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
                Method createChannel = NotificationManager.class.getMethod("createNotificationChannel", channelClass);
                createChannel.invoke(nm, monChannel);
                createChannel.invoke(nm, alarmChannel);
            } catch (Exception e) {
                e.printStackTrace();
            }
        }
    }
}
