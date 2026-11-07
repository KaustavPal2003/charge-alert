package com.chargealert.app;

import android.app.Activity;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.media.Ringtone;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.BatteryManager;
import android.os.Build;
import android.os.Bundle;
import android.os.Vibrator;
import android.provider.Settings;
import android.view.View;
import android.widget.Button;
import android.widget.CheckBox;
import android.widget.CompoundButton;
import android.widget.TextView;
import android.widget.Toast;
import java.lang.reflect.Method;

public class MainActivity extends Activity {
    private TextView tvBatteryPercent;
    private TextView tvChargingStatus;
    private TextView tvBatteryDetails;
    private Button btnToggleService;
    private Button btnTestAlert;
    private Button btnBatteryOptim;

    private CheckBox cb70, cb75, cb80, cb85, cb90, cb95, cb100;
    private CheckBox cbSound, cbVibrate, cbRepeat, cbBoot;

    private BroadcastReceiver batteryInfoReceiver;
    private SharedPreferences prefs;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        prefs = getSharedPreferences("ChargeAlertPrefs", MODE_PRIVATE);

        initViews();
        setupCheckboxListeners();
        setupButtons();
        requestNotificationPermissionIfNeeded();
        updateServiceButtonState();
    }

    private void initViews() {
        tvBatteryPercent = (TextView) findViewById(R.id.tv_battery_percent);
        tvChargingStatus = (TextView) findViewById(R.id.tv_charging_status);
        tvBatteryDetails = (TextView) findViewById(R.id.tv_battery_details);
        btnToggleService = (Button) findViewById(R.id.btn_toggle_service);
        btnTestAlert = (Button) findViewById(R.id.btn_test_alert);
        btnBatteryOptim = (Button) findViewById(R.id.btn_battery_optim);

        cb70 = (CheckBox) findViewById(R.id.cb_70);
        cb75 = (CheckBox) findViewById(R.id.cb_75);
        cb80 = (CheckBox) findViewById(R.id.cb_80);
        cb85 = (CheckBox) findViewById(R.id.cb_85);
        cb90 = (CheckBox) findViewById(R.id.cb_90);
        cb95 = (CheckBox) findViewById(R.id.cb_95);
        cb100 = (CheckBox) findViewById(R.id.cb_100);

        cbSound = (CheckBox) findViewById(R.id.cb_sound);
        cbVibrate = (CheckBox) findViewById(R.id.cb_vibrate);
        cbRepeat = (CheckBox) findViewById(R.id.cb_repeat);
        cbBoot = (CheckBox) findViewById(R.id.cb_boot);

        // Load saved values
        cb70.setChecked(prefs.getBoolean("thresh_70", false));
        cb75.setChecked(prefs.getBoolean("thresh_75", false));
        cb80.setChecked(prefs.getBoolean("thresh_80", true)); // default 80%
        cb85.setChecked(prefs.getBoolean("thresh_85", false));
        cb90.setChecked(prefs.getBoolean("thresh_90", false));
        cb95.setChecked(prefs.getBoolean("thresh_95", false));
        cb100.setChecked(prefs.getBoolean("thresh_100", true)); // default 100%

        cbSound.setChecked(prefs.getBoolean("opt_sound", true));
        cbVibrate.setChecked(prefs.getBoolean("opt_vibrate", true));
        cbRepeat.setChecked(prefs.getBoolean("opt_repeat", true));
        cbBoot.setChecked(prefs.getBoolean("opt_boot", true));
    }

    private void setupCheckboxListeners() {
        CompoundButton.OnCheckedChangeListener listener = new CompoundButton.OnCheckedChangeListener() {
            @Override
            public void onCheckedChanged(CompoundButton buttonView, boolean isChecked) {
                int id = buttonView.getId();
                SharedPreferences.Editor ed = prefs.edit();
                if (id == R.id.cb_70) ed.putBoolean("thresh_70", isChecked);
                else if (id == R.id.cb_75) ed.putBoolean("thresh_75", isChecked);
                else if (id == R.id.cb_80) ed.putBoolean("thresh_80", isChecked);
                else if (id == R.id.cb_85) ed.putBoolean("thresh_85", isChecked);
                else if (id == R.id.cb_90) ed.putBoolean("thresh_90", isChecked);
                else if (id == R.id.cb_95) ed.putBoolean("thresh_95", isChecked);
                else if (id == R.id.cb_100) ed.putBoolean("thresh_100", isChecked);
                else if (id == R.id.cb_sound) ed.putBoolean("opt_sound", isChecked);
                else if (id == R.id.cb_vibrate) ed.putBoolean("opt_vibrate", isChecked);
                else if (id == R.id.cb_repeat) ed.putBoolean("opt_repeat", isChecked);
                else if (id == R.id.cb_boot) ed.putBoolean("opt_boot", isChecked);
                ed.apply();
            }
        };

        cb70.setOnCheckedChangeListener(listener);
        cb75.setOnCheckedChangeListener(listener);
        cb80.setOnCheckedChangeListener(listener);
        cb85.setOnCheckedChangeListener(listener);
        cb90.setOnCheckedChangeListener(listener);
        cb95.setOnCheckedChangeListener(listener);
        cb100.setOnCheckedChangeListener(listener);
        cbSound.setOnCheckedChangeListener(listener);
        cbVibrate.setOnCheckedChangeListener(listener);
        cbRepeat.setOnCheckedChangeListener(listener);
        cbBoot.setOnCheckedChangeListener(listener);
    }

    private void setupButtons() {
        btnToggleService.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                Intent serviceIntent = new Intent(MainActivity.this, ChargeService.class);
                if (ChargeService.isRunning()) {
                    serviceIntent.setAction(ChargeService.ACTION_STOP_SERVICE);
                    startService(serviceIntent);
                    Toast.makeText(MainActivity.this, "Charge Alert Stopped", Toast.LENGTH_SHORT).show();
                } else {
                    startMonitoringService(serviceIntent);
                    Toast.makeText(MainActivity.this, "Monitoring Started! Keep charger plugged in.", Toast.LENGTH_SHORT).show();
                }
                btnToggleService.postDelayed(new Runnable() {
                    @Override
                    public void run() {
                        updateServiceButtonState();
                    }
                }, 200);
            }
        });

        btnTestAlert.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                testAlertSoundAndVibration();
            }
        });

        btnBatteryOptim.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                openBatteryOptimizationSettings();
            }
        });
    }

    private void startMonitoringService(Intent serviceIntent) {
        if (Build.VERSION.SDK_INT >= 26) {
            try {
                Method m = Context.class.getMethod("startForegroundService", Intent.class);
                m.invoke(this, serviceIntent);
                return;
            } catch (Exception ignored) {}
        }
        startService(serviceIntent);
    }

    private void updateServiceButtonState() {
        boolean running = ChargeService.isRunning();
        if (running) {
            btnToggleService.setText("STOP MONITORING");
            btnToggleService.setBackgroundColor(Color.parseColor("#EF4444")); // Red-500
        } else {
            btnToggleService.setText("START MONITORING");
            btnToggleService.setBackgroundColor(Color.parseColor("#10B981")); // Emerald-500
        }
    }

    private void testAlertSoundAndVibration() {
        Toast.makeText(this, "Playing alert chime test...", Toast.LENGTH_SHORT).show();
        try {
            Uri alert = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
            if (alert == null) {
                alert = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
            }
            Ringtone r = RingtoneManager.getRingtone(getApplicationContext(), alert);
            if (r != null) {
                r.play();
            }
        } catch (Exception ignored) {}

        try {
            Vibrator vib = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
            if (vib != null && vib.hasVibrator()) {
                vib.vibrate(new long[]{0, 300, 150, 300}, -1);
            }
        } catch (Exception ignored) {}
    }

    private void openBatteryOptimizationSettings() {
        try {
            if (Build.VERSION.SDK_INT >= 23) {
                Intent intent = new Intent();
                intent.setAction(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS);
                startActivity(intent);
                return;
            }
        } catch (Exception ignored) {}

        try {
            Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
            intent.setData(Uri.parse("package:" + getPackageName()));
            startActivity(intent);
        } catch (Exception e) {
            Toast.makeText(this, "Open Settings > Apps > Charge Alert > Battery > Unrestricted", Toast.LENGTH_LONG).show();
        }
    }

    private void requestNotificationPermissionIfNeeded() {
        if (Build.VERSION.SDK_INT >= 33) {
            try {
                Method checkSelfPermission = Activity.class.getMethod("checkSelfPermission", String.class);
                int result = (Integer) checkSelfPermission.invoke(this, "android.permission.POST_NOTIFICATIONS");
                if (result != 0 /* PERMISSION_GRANTED */) {
                    Method requestPermissions = Activity.class.getMethod("requestPermissions", String[].class, int.class);
                    requestPermissions.invoke(this, new String[]{"android.permission.POST_NOTIFICATIONS"}, 101);
                }
            } catch (Exception ignored) {}
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        updateServiceButtonState();
        registerBatteryMonitor();
    }

    @Override
    protected void onPause() {
        super.onPause();
        if (batteryInfoReceiver != null) {
            try {
                unregisterReceiver(batteryInfoReceiver);
            } catch (Exception ignored) {}
            batteryInfoReceiver = null;
        }
    }

    private void registerBatteryMonitor() {
        IntentFilter filter = new IntentFilter(Intent.ACTION_BATTERY_CHANGED);
        batteryInfoReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                if (intent == null) return;
                int level = intent.getIntExtra(BatteryManager.EXTRA_LEVEL, -1);
                int scale = intent.getIntExtra(BatteryManager.EXTRA_SCALE, -1);
                int status = intent.getIntExtra(BatteryManager.EXTRA_STATUS, -1);
                int plugged = intent.getIntExtra(BatteryManager.EXTRA_PLUGGED, -1);
                int temp = intent.getIntExtra(BatteryManager.EXTRA_TEMPERATURE, 0);
                int voltage = intent.getIntExtra(BatteryManager.EXTRA_VOLTAGE, 0);
                int health = intent.getIntExtra(BatteryManager.EXTRA_HEALTH, BatteryManager.BATTERY_HEALTH_UNKNOWN);

                int pct = (scale > 0) ? (level * 100 / scale) : level;
                tvBatteryPercent.setText(pct + "%");

                String statusStr;
                if (status == BatteryManager.BATTERY_STATUS_CHARGING) {
                    statusStr = "⚡ Charging in progress";
                    tvChargingStatus.setTextColor(Color.parseColor("#38BDF8"));
                } else if (status == BatteryManager.BATTERY_STATUS_FULL) {
                    statusStr = "✓ Battery Full";
                    tvChargingStatus.setTextColor(Color.parseColor("#10B981"));
                } else if (status == BatteryManager.BATTERY_STATUS_DISCHARGING) {
                    statusStr = "Discharging (Unplugged)";
                    tvChargingStatus.setTextColor(Color.parseColor("#94A3B8"));
                } else {
                    statusStr = "Not charging";
                    tvChargingStatus.setTextColor(Color.parseColor("#94A3B8"));
                }
                tvChargingStatus.setText(statusStr);

                String sourceStr = "Battery";
                if (plugged == BatteryManager.BATTERY_PLUGGED_AC) sourceStr = "AC Wall Adapter";
                else if (plugged == BatteryManager.BATTERY_PLUGGED_USB) sourceStr = "USB Port";
                else if (plugged == 4 /* WIRELESS */) sourceStr = "Wireless Charger";

                String healthStr = "Good";
                if (health == BatteryManager.BATTERY_HEALTH_OVERHEAT) healthStr = "Overheat!";
                else if (health == BatteryManager.BATTERY_HEALTH_OVER_VOLTAGE) healthStr = "Over Voltage";

                float tempC = temp / 10.0f;
                tvBatteryDetails.setText("Source: " + sourceStr + " | Health: " + healthStr + " | Temp: " + tempC + "°C (" + voltage + "mV)");
            }
        };

        registerReceiver(batteryInfoReceiver, filter);
    }
}
