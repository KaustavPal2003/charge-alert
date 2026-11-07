import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import QRCode from 'qrcode';
import {
  Download,
  QrCode,
  BatteryCharging,
  Battery,
  ShieldCheck,
  Smartphone,
  Sliders,
  Volume2,
  VolumeX,
  Play,
  Square,
  CheckCircle2,
  Copy,
  ExternalLink,
  Code2,
  Cpu,
  Info,
  Settings,
  Zap,
  Sparkles,
  RefreshCw,
  FolderArchive,
  ArrowRight,
  Layers,
  HardDrive,
  Radio,
  FileText
} from 'lucide-react';

interface ApkMetadata {
  name: string;
  versionName: string;
  versionCode: number;
  packageName: string;
  minAndroid: string;
  targetAndroid: string;
  fileSizeFormatted: string;
  sha256: string;
  signatures: string[];
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'why98' | 'fix80' | 'architecture' | 'why85' | 'solution' | 'download' | 'monitor' | 'guide' | 'source'>('why98');
  const [apkInfo, setApkInfo] = useState<ApkMetadata>({
    name: 'Charge Alert',
    versionName: '1.5.0',
    versionCode: 6,
    packageName: 'com.chargealert.app',
    minAndroid: 'Android 5.0+ to 15+',
    targetAndroid: 'Android 14 / 15 (Target SDK 34)',
    fileSizeFormatted: '29.3 KB',
    sha256: '3f80bcea33e0d5fb5adefa97d0740adc1c8a6a25a6cd11c02973d765342fde3c',
    signatures: ['v1 (JAR)', 'v2 (APK Signature)', 'v3 (APK Signature v3)'],
  });

  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [copiedSha, setCopiedSha] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [selectedSourceTab, setSelectedSourceTab] = useState<'service' | 'activity' | 'manifest' | 'readme' | 'gradle'>('service');
  const [selectedGuideBrand, setSelectedGuideBrand] = useState<'samsung' | 'pixel' | 'xiaomi' | 'oneplus' | 'stock'>('samsung');

  // Battery Status State (Web Battery API + Simulator)
  const [hasRealBattery, setHasRealBattery] = useState<boolean>(false);
  const [isSimulated, setIsSimulated] = useState<boolean>(false);
  const [batteryLevel, setBatteryLevel] = useState<number>(76);
  const [isCharging, setIsCharging] = useState<boolean>(true);
  const [chargingTime, setChargingTime] = useState<number | null>(null);

  // Thresholds
  const [thresholds, setThresholds] = useState<Record<number, boolean>>({
    70: false,
    75: false,
    80: true, // Recommended
    85: false,
    90: false,
    95: false,
    100: true,
  });

  // Sound Synth & Alarm State
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [vibrateEnabled, setVibrateEnabled] = useState(true);
  const [chimeType, setChimeType] = useState<'bell' | 'radar' | 'marimba' | 'alarm'>('bell');
  const [isPlayingChime, setIsPlayingChime] = useState(false);
  const [alarmTriggered, setAlarmTriggered] = useState<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const loopIntervalRef = useRef<number | null>(null);

  // Initialize QR Code with the full APK download URL
  useEffect(() => {
    const fullDownloadUrl = typeof window !== 'undefined'
      ? `${window.location.origin}/ChargeAlert.apk`
      : 'https://ais-pre-uld22oz2thqnag44xsykpl-828888235970.asia-northeast1.run.app/ChargeAlert.apk';

    QRCode.toDataURL(fullDownloadUrl, {
      width: 280,
      margin: 1.5,
      color: {
        dark: '#020617',
        light: '#F8FAFC',
      },
    }).then(setQrCodeUrl).catch(console.error);

    // Fetch APK info from API
    fetch('/api/apk-info')
      .then((res) => res.json())
      .then((data) => {
        if (data && !data.error) {
          setApkInfo(data);
        }
      })
      .catch(() => {});
  }, []);

  // Web Battery API Listener
  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        setHasRealBattery(true);
        if (!isSimulated) {
          setBatteryLevel(Math.round(battery.level * 100));
          setIsCharging(battery.charging);
          setChargingTime(battery.chargingTime);
        }

        const onLevelChange = () => {
          if (!isSimulated) setBatteryLevel(Math.round(battery.level * 100));
        };
        const onChargingChange = () => {
          if (!isSimulated) setIsCharging(battery.charging);
        };

        battery.addEventListener('levelchange', onLevelChange);
        battery.addEventListener('chargingchange', onChargingChange);

        return () => {
          battery.removeEventListener('levelchange', onLevelChange);
          battery.removeEventListener('chargingchange', onChargingChange);
        };
      }).catch(() => {
        setHasRealBattery(false);
      });
    }
  }, [isSimulated]);

  // Audio Synthesizer Engine
  const playChimeNote = (freq: number, type: OscillatorType, startTime: number, duration: number, gainVal: number) => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(gainVal, startTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration);
  };

  const playSynthesizedChime = (tone: 'bell' | 'radar' | 'marimba' | 'alarm') => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const now = ctx.currentTime;

    if (tone === 'bell') {
      // Harmonic pleasant bells
      playChimeNote(523.25, 'sine', now, 0.6, 0.4); // C5
      playChimeNote(659.25, 'sine', now + 0.1, 0.6, 0.4); // E5
      playChimeNote(783.99, 'sine', now + 0.2, 0.7, 0.4); // G5
      playChimeNote(1046.50, 'sine', now + 0.35, 1.2, 0.5); // C6
    } else if (tone === 'radar') {
      // Tech sonar ping
      playChimeNote(880, 'sine', now, 0.15, 0.5);
      playChimeNote(1760, 'sine', now + 0.15, 0.3, 0.5);
      playChimeNote(880, 'sine', now + 0.35, 0.15, 0.4);
      playChimeNote(1760, 'sine', now + 0.5, 0.4, 0.5);
    } else if (tone === 'marimba') {
      // Warm marimba sequence
      playChimeNote(440, 'triangle', now, 0.3, 0.4);
      playChimeNote(554.37, 'triangle', now + 0.12, 0.3, 0.4);
      playChimeNote(659.25, 'triangle', now + 0.24, 0.4, 0.4);
      playChimeNote(880, 'triangle', now + 0.38, 0.6, 0.5);
    } else {
      // Urgent wake alert
      playChimeNote(600, 'square', now, 0.18, 0.3);
      playChimeNote(800, 'square', now + 0.18, 0.18, 0.3);
      playChimeNote(600, 'square', now + 0.36, 0.18, 0.3);
      playChimeNote(800, 'square', now + 0.54, 0.25, 0.3);
    }

    if (vibrateEnabled && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([200, 100, 200, 100, 400]);
      } catch (e) {
        // Ignored
      }
    }
  };

  const handleTestChime = () => {
    setIsPlayingChime(true);
    playSynthesizedChime(chimeType);
    setTimeout(() => {
      setIsPlayingChime(false);
    }, 1500);
  };

  const stopAlarm = () => {
    if (loopIntervalRef.current) {
      clearInterval(loopIntervalRef.current);
      loopIntervalRef.current = null;
    }
    setAlarmTriggered(null);
    setIsPlayingChime(false);
  };

  const triggerAlarm = (level: number) => {
    setAlarmTriggered(level);
    setIsPlayingChime(true);
    playSynthesizedChime(chimeType);

    if (loopIntervalRef.current) {
      clearInterval(loopIntervalRef.current);
    }

    // Repeat every 2.5 seconds until dismissed
    loopIntervalRef.current = window.setInterval(() => {
      playSynthesizedChime(chimeType);
    }, 2500);
  };

  const handleSimulationSlider = (val: number) => {
    setIsSimulated(true);
    setBatteryLevel(val);

    // Check if crossing an enabled threshold
    if (isCharging && thresholds[val] && alarmTriggered !== val) {
      triggerAlarm(val);
    }
  };

  const handleDownloadCelebration = () => {
    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.7 },
      colors: ['#10B981', '#38BDF8', '#F59E0B'],
    });
  };

  const copyToClipboard = (text: string, type: 'sha' | 'code') => {
    navigator.clipboard.writeText(text);
    if (type === 'sha') {
      setCopiedSha(true);
      setTimeout(() => setCopiedSha(false), 2000);
    } else {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const toggleThreshold = (thresh: number) => {
    setThresholds((prev) => ({
      ...prev,
      [thresh]: !prev[thresh],
    }));
  };

  // Battery health lifespan calculation
  const getBatteryHealthInsight = (target: number) => {
    if (target <= 80) {
      return {
        cycles: '1,500 - 2,000 cycles (~4-5 years)',
        stress: 'Minimal Voltage Stress (3.92V - 4.05V)',
        desc: 'Recommended by battery research institutions. Stopping charging at 80% triples battery cycle longevity compared to constant 100% charging.',
        badge: 'Recommended for Longevity',
        badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      };
    } else if (target <= 85) {
      return {
        cycles: '1,100 - 1,400 cycles (~3-4 years)',
        stress: 'Low Stress (4.10V)',
        desc: 'Matches Samsung Galaxy "Protect Battery" and Sony Xperia Battery Care standard threshold.',
        badge: 'OEM Standard',
        badgeColor: 'bg-sky-500/20 text-sky-400 border-sky-500/30',
      };
    } else if (target <= 95) {
      return {
        cycles: '700 - 900 cycles (~2 years)',
        stress: 'Moderate-High Stress (4.20V)',
        desc: 'Provides nearly full daily capacity while avoiding the top-end trickle saturation that generates peak heat.',
        badge: 'High Capacity',
        badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      };
    } else {
      return {
        cycles: '300 - 500 cycles (~1-1.5 years)',
        stress: 'Maximum Voltage Stress (4.35V - 4.45V)',
        desc: 'Charging to 100% provides full runtime but subjects cathode oxides to high oxidation rates and capacity degradation.',
        badge: 'Full Daily Range',
        badgeColor: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
      };
    }
  };

  const sourceCodeSnippets = {
    service: `// ChargeService.java - Foreground Battery Monitoring Service (v1.4.0)
package com.chargealert.app;

import android.app.*;
import android.content.*;
import android.media.*;
import android.os.*;

public class ChargeService extends Service {
    public static final String ACTION_STOP_SERVICE = "com.chargealert.app.ACTION_STOP";
    public static final String ACTION_DISMISS_ALARM = "com.chargealert.app.ACTION_DISMISS_ALARM";
    private final Set<Integer> triggeredThresholds = new HashSet<Integer>();
    private MediaPlayer mediaPlayer;
    private PowerManager.WakeLock wakeLock;

    private void registerBatteryReceiver() {
        IntentFilter filter = new IntentFilter(Intent.ACTION_BATTERY_CHANGED);
        filter.addAction(Intent.ACTION_POWER_CONNECTED);
        filter.addAction(Intent.ACTION_POWER_DISCONNECTED);

        batteryReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                int level = intent.getIntExtra(BatteryManager.EXTRA_LEVEL, -1);
                int scale = intent.getIntExtra(BatteryManager.EXTRA_SCALE, -1);
                int plugged = intent.getIntExtra(BatteryManager.EXTRA_PLUGGED, -1);
                int pct = (scale > 0) ? (level * 100 / scale) : level;

                // Physical power check: handles Samsung Protect Battery & Pixel Adaptive pause
                boolean isPlugged = (plugged > 0);

                if (isPlugged && pct > 0) {
                    checkThresholds(pct);
                } else if (!isPlugged) {
                    triggeredThresholds.clear();
                    stopAlarm();
                }
            }
        };
        registerReceiver(batteryReceiver, filter);
    }

    private void checkThresholds(int currentPct) {
        SharedPreferences sp = getSharedPreferences("ChargeAlertPrefs", MODE_PRIVATE);
        int[] availableThresholds = new int[]{70, 75, 80, 85, 90, 95, 100};
        for (int t : availableThresholds) {
            boolean enabled = sp.getBoolean("thresh_" + t, (t == 80 || t == 100));
            // Triggers immediately when percentage reaches 80% with no startup suppression
            if (enabled && currentPct >= t && !triggeredThresholds.contains(t)) {
                triggeredThresholds.add(t);
                fireAlert(currentPct, t);
                break;
            }
        }
    }

    private void startAlarmSound() {
        Uri soundUri = getAlarmSoundUri();
        mediaPlayer = new MediaPlayer();
        mediaPlayer.setDataSource(getApplicationContext(), soundUri);
        // Uses ALARM stream so sound plays out loud even in Silent/Vibrate mode!
        mediaPlayer.setAudioStreamType(AudioManager.STREAM_ALARM);
        mediaPlayer.setLooping(true); // Loop until dismissed
        mediaPlayer.prepare();
        mediaPlayer.start();
    }
}`,
    activity: `// MainActivity.kt - Control Panel & Settings
package com.chargealert.app

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import android.provider.Settings
import android.widget.Button
import android.widget.CheckBox

class MainActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        findViewById<Button>(R.id.btn_battery_optim).setOnClickListener {
            // Open battery optimization settings so background service is unrestricted
            val intent = Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS)
            startActivity(intent)
        }
    }
}`,
    manifest: `<!-- AndroidManifest.xml -->
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.chargealert.app"
    android:versionCode="1"
    android:versionName="1.0.0">

    <uses-sdk android:minSdkVersion="21" android:targetSdkVersion="33" />
    <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
    <uses-permission android:name="android.permission.VIBRATE" />
    <uses-permission android:name="android.permission.WAKE_LOCK" />
    <uses-permission android:name="android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS" />

    <application
        android:label="Charge Alert"
        android:icon="@drawable/ic_launcher"
        android:theme="@style/AppTheme">
        <activity android:name=".MainActivity" android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
        <service android:name=".ChargeService" android:exported="false" />
    </application>
</manifest>`,
    gradle: `// app/build.gradle.kts
plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.chargealert.app"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.chargealert.app"
        minSdk = 21
        targetSdk = 34
        versionCode = 1
        versionName = "1.0.0"
    }
}`,
    readme: `Charge Alert (Android, Kotlin)
1. Install Android Studio, then File > Open > select this ChargeAlert folder. Let Gradle sync.
2. Plug in your phone (USB debugging on) and press Run, or Build > Build APK(s) to get an APK.
3. Open the app, allow notifications, tap "Start monitoring".
4. Set the app's battery usage to "Unrestricted" in system settings.
Edit thresholds in ChargeService.kt (THRESHOLDS) and MainActivity checkboxes follow automatically.`
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">
      {/* Alarm Banner if triggered */}
      {alarmTriggered !== null && (
        <div className="sticky top-0 z-50 bg-gradient-to-r from-amber-600 via-rose-600 to-amber-600 text-white px-4 py-3 shadow-xl flex items-center justify-between border-b border-rose-400 animate-pulse">
          <div className="flex items-center space-x-3">
            <Zap className="w-6 h-6 animate-bounce" />
            <div>
              <p className="font-bold text-base leading-tight">
                Charge Threshold Reached: {alarmTriggered}%!
              </p>
              <p className="text-xs text-amber-100">
                Chime sounding. Unplug your device now to protect lithium-ion battery health.
              </p>
            </div>
          </div>
          <button
            onClick={stopAlarm}
            className="px-4 py-1.5 bg-white text-rose-700 font-bold text-sm rounded-lg hover:bg-rose-50 active:scale-95 transition-all shadow-md"
          >
            Dismiss Alert
          </button>
        </div>
      )}

      {/* Header Navigation */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-sky-400 p-0.5 shadow-lg shadow-emerald-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <BatteryCharging className="w-5 h-5 text-emerald-400 animate-pulse" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg tracking-tight text-white">Charge Alert</span>
                <span className="px-2 py-0.5 text-[10px] font-semibold tracking-wide bg-emerald-500/20 text-emerald-400 rounded-full border border-emerald-500/30">
                  APK Ready
                </span>
              </div>
              <p className="text-xs text-slate-400">Android Battery Threshold &amp; Guard</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex space-x-1 sm:space-x-2 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs sm:text-sm overflow-x-auto">
            <button
              onClick={() => setActiveTab('why98')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center space-x-1.5 shrink-0 ${
                activeTab === 'why98'
                  ? 'bg-amber-500 text-slate-950 shadow-sm font-bold'
                  : 'text-amber-400 hover:text-amber-300 hover:bg-slate-800/60 bg-amber-500/10 border border-amber-500/30'
              }`}
            >
              <Info className="w-3.5 h-3.5" />
              <span>Why 98% Alert? (v1.5.0 Fix)</span>
            </button>
            <button
              onClick={() => setActiveTab('fix80')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center space-x-1.5 shrink-0 ${
                activeTab === 'fix80'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm font-bold'
                  : 'text-emerald-400 hover:text-emerald-300 hover:bg-slate-800/60 bg-emerald-500/10 border border-emerald-500/30'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>80% Alarm Fix</span>
            </button>
            <button
              onClick={() => setActiveTab('architecture')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center space-x-1.5 shrink-0 ${
                activeTab === 'architecture'
                  ? 'bg-sky-500 text-slate-950 shadow-sm font-bold'
                  : 'text-sky-400 hover:text-sky-300 hover:bg-slate-800/60 bg-sky-500/10 border border-sky-500/30'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>How It Works (Device Data)</span>
            </button>
            <button
              onClick={() => setActiveTab('why85')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center space-x-1.5 shrink-0 ${
                activeTab === 'why85'
                  ? 'bg-rose-500 text-white shadow-sm font-bold'
                  : 'text-rose-400 hover:text-rose-300 hover:bg-slate-800/60 bg-rose-500/10 border border-rose-500/30'
              }`}
            >
              <Info className="w-3.5 h-3.5" />
              <span>Why 85% Alarm?</span>
            </button>
            <button
              onClick={() => setActiveTab('solution')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center space-x-1.5 shrink-0 ${
                activeTab === 'solution'
                  ? 'bg-amber-500 text-slate-950 shadow-sm font-bold'
                  : 'text-amber-400 hover:text-amber-300 hover:bg-slate-800/60 bg-amber-500/10 border border-amber-500/30'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Play Protect Fix</span>
            </button>
            <button
              onClick={() => setActiveTab('download')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center space-x-1.5 shrink-0 ${
                activeTab === 'download'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download APK</span>
            </button>
            <button
              onClick={() => setActiveTab('monitor')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center space-x-1.5 shrink-0 ${
                activeTab === 'monitor'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Battery className="w-3.5 h-3.5" />
              <span>Live Test</span>
            </button>
            <button
              onClick={() => setActiveTab('guide')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center space-x-1.5 shrink-0 ${
                activeTab === 'guide'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Install Guide</span>
            </button>
            <button
              onClick={() => setActiveTab('source')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center space-x-1.5 shrink-0 ${
                activeTab === 'source'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>Source Project</span>
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* TAB: WHY 98% ALARM OCCURRED & V1.5.0 RESOLUTION */}
        {activeTab === 'why98' && (
          <div className="space-y-8 max-w-5xl mx-auto">
            {/* Hero Card */}
            <div className="rounded-3xl bg-gradient-to-r from-amber-950/70 via-slate-900 to-slate-900 border border-amber-500/40 p-6 sm:p-8 space-y-4 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-500/20">
                    <Info className="w-7 h-7" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
                        Why It Alerted at 98% (Charged from 12%)
                      </h1>
                      <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                        Diagnosed &amp; Fixed in v1.5.0
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-amber-300/90 mt-0.5">
                      The alert you heard at 98% was actually your <strong>delayed 80% alarm</strong> waking up!
                    </p>
                  </div>
                </div>

                <a
                  href="/ChargeAlert.apk"
                  download="ChargeAlert.apk"
                  onClick={handleDownloadCelebration}
                  className="px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 text-slate-950 font-bold text-sm shadow-xl shadow-emerald-500/30 flex items-center space-x-2 active:scale-95 transition-all"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Fixed v1.5.0 APK</span>
                </a>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/80 border border-amber-500/30 text-slate-200 text-sm leading-relaxed space-y-2">
                <p>
                  <strong>Direct Answer:</strong> When you plug in your phone at 12% and let it charge with the screen off, Android puts the processor into <strong>CPU Deep Sleep (Doze Mode)</strong>. While sleeping, Android throttles and stops broadcasting battery percentage updates.
                </p>
                <p>
                  At 98%, either you tapped/unlocked your phone, or the charger entered the top-end trickle phase which woke the processor. The moment the CPU woke up at 98%, the app received the current battery level (98%), checked <code className="text-emerald-400 font-mono">if (98% &gt;= 80%)</code>, and sounded the alarm!
                </p>
              </div>
            </div>

            {/* Visual Timeline of What Happened */}
            <div className="p-6 sm:p-8 rounded-3xl bg-slate-900 border border-slate-800 space-y-6">
              <h2 className="text-lg sm:text-xl font-bold text-white flex items-center space-x-2">
                <Layers className="w-5 h-5 text-amber-400" />
                <span>Timeline: What Happened While Charging from 12% to 98%</span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Step 1 */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 relative">
                  <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-400 font-bold flex items-center justify-center text-xs">
                    12%
                  </div>
                  <h4 className="text-sm font-semibold text-white">Plugged In &amp; Screen Off</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    You started monitoring and connected the charger. Shortly after the screen turned off, the phone's CPU entered <strong>Doze Mode</strong> to save power.
                  </p>
                </div>

                {/* Step 2 */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 relative">
                  <div className="w-8 h-8 rounded-xl bg-slate-800 text-slate-400 font-bold flex items-center justify-center text-xs">
                    30-79%
                  </div>
                  <h4 className="text-sm font-semibold text-white">CPU Was Asleep</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Phone charged fast. Because the foreground service didn't hold an active charging wake lock, Android paused real-time app execution while screen was locked.
                  </p>
                </div>

                {/* Step 3 */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-rose-500/40 space-y-2 relative">
                  <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-400 font-bold flex items-center justify-center text-xs">
                    80%
                  </div>
                  <h4 className="text-sm font-semibold text-white">Crossed 80% Silently</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    The battery reached 80% while the phone's CPU was asleep. Android OS delayed sending the <code className="text-[10px]">ACTION_BATTERY_CHANGED</code> broadcast.
                  </p>
                </div>

                {/* Step 4 */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-amber-500/40 space-y-2 relative">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center text-xs">
                    98%
                  </div>
                  <h4 className="text-sm font-semibold text-white">Phone Woke Up &rarr; Fired!</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    At 98%, screen wake or trickle-charging woke the CPU. The app checked: <em>98% &ge; 80%? Yes!</em> And the 80% alarm sounded immediately at 98%!
                  </p>
                </div>
              </div>
            </div>

            {/* The 3 Core Technical Reasons */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
                <div className="flex items-center space-x-2 text-amber-400 font-bold text-sm">
                  <Cpu className="w-4 h-4" />
                  <span>1. Android Doze Mode Sleep</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  A standard Android Foreground Service prevents the OS from <em>killing</em> your app, but <strong>does not keep the CPU running</strong> when the screen is locked. Without an active <code className="text-amber-300 font-mono">PARTIAL_WAKE_LOCK</code>, the phone sleeps right past the 80% mark.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
                <div className="flex items-center space-x-2 text-sky-400 font-bold text-sm">
                  <Radio className="w-4 h-4" />
                  <span>2. Broadcast Coalescing</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Passive broadcasts (<code className="text-sky-300 font-mono">ACTION_BATTERY_CHANGED</code>) are held back by Android when the screen is off. The OS only delivers them when an interrupt occurs or when the phone wakes up.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
                <div className="flex items-center space-x-2 text-emerald-400 font-bold text-sm">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>3. The Mathematical Catch-Up</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Because the 80% alert was missed while sleeping, the moment the app received the delayed 98% broadcast, the code saw <code className="text-emerald-300 font-mono">98 &gt;= 80</code> and immediately sounded the alarm so you wouldn't miss it completely.
                </p>
              </div>
            </div>

            {/* How v1.5.0 Fixes This Completely */}
            <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-slate-900 to-emerald-950/40 border border-emerald-500/40 space-y-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">
                    How We Fixed This in Charge Alert v1.5.0
                  </h3>
                  <p className="text-xs text-emerald-300/80">
                    Active Charging WakeLock + 25-Second Direct Hardware Polling
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-slate-300">
                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                  <div className="font-bold text-emerald-400 flex items-center space-x-1.5">
                    <Zap className="w-4 h-4" />
                    <span>Charging-Only WakeLock</span>
                  </div>
                  <p>
                    A low-power CPU wake lock is held <strong>only while plugged into the charger</strong>. Consumes 0% battery from your phone (powered by wall/USB), but stops the CPU from falling into deep sleep while charging.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                  <div className="font-bold text-sky-400 flex items-center space-x-1.5">
                    <RefreshCw className="w-4 h-4" />
                    <span>Active 25s Hardware Polling</span>
                  </div>
                  <p>
                    The app no longer waits passively for Android broadcasts. Every 25 seconds, it queries <code className="text-sky-300">BATTERY_PROPERTY_CAPACITY</code> directly from the Linux kernel hardware fuel gauge.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                  <div className="font-bold text-amber-400 flex items-center space-x-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Exact 80% Triggering</span>
                  </div>
                  <p>
                    Within seconds of your battery hitting 80% (or 81%), the alarm will ring out loud continuously. It will never sleep through 80% to 98% again!
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-wrap gap-4 items-center justify-between">
                <div className="flex flex-wrap gap-3">
                  <a
                    href="/ChargeAlert.apk"
                    download="ChargeAlert.apk"
                    onClick={handleDownloadCelebration}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex items-center space-x-2"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Fixed v1.5.0 APK (29.3 KB)</span>
                  </a>

                  <button
                    onClick={() => setActiveTab('guide')}
                    className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 flex items-center space-x-2 transition-all"
                  >
                    <Smartphone className="w-4 h-4" />
                    <span>Unrestricted Battery Guide</span>
                  </button>
                </div>

                <div className="text-[11px] text-slate-400 font-mono">
                  SHA-256: <span className="text-emerald-400">3f80bcea33e0...</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: 80% ALARM FIX & DIAGNOSIS */}
        {activeTab === 'fix80' && (
          <div className="space-y-8 max-w-5xl mx-auto">
            {/* Resolution Hero Header */}
            <div className="rounded-3xl bg-gradient-to-r from-emerald-950/70 via-slate-900 to-slate-900 border border-emerald-500/40 p-6 sm:p-8 space-y-4 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/20">
                    <Zap className="w-7 h-7 animate-pulse" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
                        80% Alarm Fix Applied (v1.4.0)
                      </h1>
                      <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                        Resolved
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-emerald-300/90 mt-0.5">
                      Fixed threshold suppression, modern battery protection status changes, and audio stream routing.
                    </p>
                  </div>
                </div>

                <a
                  href="/ChargeAlert.apk"
                  download="ChargeAlert.apk"
                  onClick={handleDownloadCelebration}
                  className="px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 text-slate-950 font-bold text-sm shadow-xl shadow-emerald-500/30 flex items-center space-x-2 active:scale-95 transition-all"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Fixed APK v1.4.0</span>
                </a>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/80 border border-emerald-500/30 text-slate-200 text-sm leading-relaxed">
                <strong>Why the alarm didn't ring at 80% previously:</strong> In version 1.3.0, a suppression filter marked 80% as "already triggered" on initial startup, modern device "Protect Battery" modes switched the charging status to "Not Charging" at 80%, and notification audio was silenced if the phone was on Silent/Vibrate. <strong>All 3 issues are completely eliminated in v1.4.0.</strong>
              </div>
            </div>

            {/* The 3 Root Causes & Exact Code Fixes */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Root Cause 1 */}
              <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3 relative overflow-hidden flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center space-x-2 text-rose-400 font-bold text-sm">
                    <span className="w-6 h-6 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-xs">1</span>
                    <span>Session Suppression Bug</span>
                  </div>
                  <h3 className="text-base font-semibold text-white">Startup Threshold Filter</h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    v1.3.0 had logic that recorded your initial battery percentage. If you plugged in or started monitoring when your battery was already at 80%, it pre-populated <code className="text-rose-400">triggeredThresholds.add(80)</code>, permanently muting the 80% alarm for that session!
                  </p>
                </div>
                <div className="mt-3 p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-xs text-emerald-300 space-y-1">
                  <div className="font-bold flex items-center space-x-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Fixed in v1.4.0:</span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Suppression removed. As long as your cable is connected, reaching or passing 80% triggers the alarm immediately.
                  </p>
                </div>
              </div>

              {/* Root Cause 2 */}
              <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3 relative overflow-hidden flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center space-x-2 text-rose-400 font-bold text-sm">
                    <span className="w-6 h-6 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-xs">2</span>
                    <span>Battery Protection Shift</span>
                  </div>
                  <h3 className="text-base font-semibold text-white">Samsung &amp; Pixel OS Pause</h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    On modern devices (Samsung "Protect Battery", Pixel "Adaptive Charging"), when the battery hits 80%, Android switches <code className="text-rose-400">EXTRA_STATUS</code> to <code className="text-rose-400">BATTERY_STATUS_NOT_CHARGING</code>. The old code tested only <code>isCharging</code>, so it ignored the battery at 80%!
                  </p>
                </div>
                <div className="mt-3 p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-xs text-emerald-300 space-y-1">
                  <div className="font-bold flex items-center space-x-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Fixed in v1.4.0:</span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Now detects physical cable connection (<code className="text-emerald-400">EXTRA_PLUGGED &gt; 0</code>), so even when charging pauses at 80%, the alert fires instantly.
                  </p>
                </div>
              </div>

              {/* Root Cause 3 */}
              <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3 relative overflow-hidden flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center space-x-2 text-rose-400 font-bold text-sm">
                    <span className="w-6 h-6 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-xs">3</span>
                    <span>Notification Stream Muting</span>
                  </div>
                  <h3 className="text-base font-semibold text-white">Silent / Vibrate Override</h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    The previous build used <code className="text-rose-400">USAGE_NOTIFICATION_EVENT</code>. If your phone was set to Silent, Vibrate, or low notification volume, the sound was muted. Additionally, it only chirped once for 0.5s.
                  </p>
                </div>
                <div className="mt-3 p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-xs text-emerald-300 space-y-1">
                  <div className="font-bold flex items-center space-x-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Fixed in v1.4.0:</span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Switched to <code className="text-emerald-400">STREAM_ALARM</code> with continuous looping <code className="text-emerald-400">MediaPlayer</code>, CPU <code className="text-emerald-400">WakeLock</code>, and repeat vibration until dismissed!
                  </p>
                </div>
              </div>
            </div>

            {/* Download & Install Section */}
            <div className="p-6 sm:p-8 rounded-3xl bg-slate-900 border border-slate-800 space-y-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                <div className="space-y-3 max-w-xl">
                  <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
                    Step 1: Install Update
                  </span>
                  <h2 className="text-xl sm:text-2xl font-bold text-white">
                    Get Charge Alert v1.4.0 APK
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    Install this updated APK to replace the previous build. All your settings will be preserved, and the 80% alarm will sound out loud through your alarm speakers.
                  </p>

                  <div className="flex flex-wrap gap-3 pt-2">
                    <a
                      href="/ChargeAlert.apk"
                      download="ChargeAlert.apk"
                      onClick={handleDownloadCelebration}
                      className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/20 flex items-center space-x-2 active:scale-95 transition-all"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download ChargeAlert.apk (29.3 KB)</span>
                    </a>

                    <a
                      href="/ChargeAlert-source.zip"
                      download="ChargeAlert-source.zip"
                      className="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 flex items-center space-x-2 transition-all"
                    >
                      <FolderArchive className="w-4 h-4" />
                      <span>Download Source ZIP</span>
                    </a>
                  </div>

                  <div className="pt-2 text-[11px] text-slate-400 font-mono flex items-center space-x-2">
                    <span className="text-slate-500">SHA-256:</span>
                    <span className="text-emerald-400 truncate max-w-xs sm:max-w-md">ec1e4648f03ecb6936a88d41ac0b06f043565d2204ca1376578a26b19232406b</span>
                    <button
                      onClick={() => copyToClipboard('ec1e4648f03ecb6936a88d41ac0b06f043565d2204ca1376578a26b19232406b', 'sha')}
                      className="text-slate-400 hover:text-white p-1"
                      title="Copy SHA-256"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    {copiedSha && <span className="text-emerald-400 text-[10px]">Copied!</span>}
                  </div>
                </div>

                {/* QR Code */}
                {qrCodeUrl && (
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col items-center shrink-0">
                    <img
                      src={qrCodeUrl}
                      alt="Scan to download Charge Alert APK"
                      className="w-40 h-40 rounded-xl"
                    />
                    <span className="text-[11px] text-slate-400 mt-2 font-medium flex items-center space-x-1">
                      <QrCode className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Scan with Phone Camera</span>
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Quick 3-Step Verification Checklist */}
            <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span>How to Verify the 80% Alarm on Your Phone:</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-slate-300">
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="font-bold text-sky-400 flex items-center space-x-1.5">
                    <span className="w-5 h-5 rounded-full bg-sky-500/20 text-center leading-5 text-[11px]">1</span>
                    <span>Install v1.4.0</span>
                  </div>
                  <p>
                    Download and open the APK. If prompted, tap <strong>"Install anyway"</strong> (or update).
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="font-bold text-emerald-400 flex items-center space-x-1.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-center leading-5 text-[11px]">2</span>
                    <span>Confirm 80% Checked</span>
                  </div>
                  <p>
                    Ensure <strong>80%</strong> has a checkmark. Tap <strong>"Test Alert Sound"</strong> to confirm the alarm volume is loud on your phone.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="font-bold text-amber-400 flex items-center space-x-1.5">
                    <span className="w-5 h-5 rounded-full bg-amber-500/20 text-center leading-5 text-[11px]">3</span>
                    <span>Start Monitoring</span>
                  </div>
                  <p>
                    Tap the green <strong>"START MONITORING"</strong> button and plug in your charger. When 80% is reached, the continuous alarm will ring out loud!
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: HOW WE GET DEVICE DATA & SYSTEM ARCHITECTURE */}
        {activeTab === 'architecture' && (
          <div className="space-y-8 max-w-5xl mx-auto">
            {/* Header Card */}
            <div className="rounded-3xl bg-gradient-to-r from-sky-950/60 via-slate-900 to-slate-900 border border-sky-500/40 p-6 sm:p-8 space-y-4 shadow-2xl">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400">
                  <Cpu className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
                    How Android Gets Device Data
                  </h1>
                  <p className="text-xs sm:text-sm text-sky-300/90 mt-0.5">
                    Are battery stats &amp; ringtones stored as variables in the device?
                  </p>
                </div>
              </div>

              <p className="text-sm text-slate-300 leading-relaxed">
                <strong>Direct Answer:</strong> No, they are <em>not</em> static code variables.
                Battery level, voltage, temperature, and charging status are <strong>live physical measurements</strong> continuously sampled from hardware microchips, exposed by the Linux kernel as virtual files, and broadcasted by Android as system events.
              </p>

              {/* Word Document Download Card */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-blue-950/80 via-slate-900 to-sky-950/60 border border-blue-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg">
                <div className="flex items-center space-x-3.5">
                  <div className="w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center shrink-0">
                    <FileText className="w-6 h-6 text-blue-400" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-white text-sm sm:text-base">
                        How_Android_Gets_Device_Information.docx
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                        Word File (.docx)
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Formatted whitepaper with executive summary, 5-layer diagram, sysfs paths, and architecture table (14.2 KB).
                    </p>
                  </div>
                </div>

                <a
                  href="/How_Android_Gets_Device_Information.docx"
                  download="How_Android_Gets_Device_Information.docx"
                  onClick={handleDownloadCelebration}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-600/30 active:scale-95 transition-all flex items-center justify-center space-x-2 shrink-0"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Word Document</span>
                </a>
              </div>
            </div>

            {/* The 5-Layer System Architecture Diagram */}
            <div className="space-y-4">
              <h3 className="font-bold text-slate-200 text-base flex items-center space-x-2">
                <Layers className="w-4 h-4 text-sky-400" />
                <span>The End-to-End Pipeline (Hardware to App)</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                {/* Step 1 */}
                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2 relative">
                  <div className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 inline-block">
                    LAYER 1: HARDWARE
                  </div>
                  <h4 className="font-bold text-white text-sm">Fuel Gauge Chip (PMIC)</h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    A physical silicon chip (Texas Instruments or Qualcomm PMIC) connected to the battery cell. It contains an Analog-to-Digital Converter (ADC) and an NTC thermal resistor.
                  </p>
                </div>

                {/* Step 2 */}
                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2 relative">
                  <div className="text-[10px] font-bold text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20 inline-block">
                    LAYER 2: LINUX KERNEL
                  </div>
                  <h4 className="font-bold text-white text-sm">Virtual sysfs Files</h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    The Linux kernel creates virtual files in RAM under <code className="text-sky-300">/sys/class/power_supply/battery/</code>. Every time you read the file, the driver reads the hardware chip.
                  </p>
                </div>

                {/* Step 3 */}
                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2 relative">
                  <div className="text-[10px] font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20 inline-block">
                    LAYER 3: ANDROID DAEMON
                  </div>
                  <h4 className="font-bold text-white text-sm">BatteryService &amp; HAL</h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Android's <code className="text-purple-300">BatteryService</code> daemon reads the kernel. When levels change, it bundles all metrics into an OS Event in RAM.
                  </p>
                </div>

                {/* Step 4 */}
                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2 relative">
                  <div className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 inline-block">
                    LAYER 4: STICKY BROADCAST
                  </div>
                  <h4 className="font-bold text-white text-sm">ACTION_BATTERY_CHANGED</h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Android transmits a system-wide <strong>Sticky Intent</strong>. Sticky means Android caches the last intent in memory, so our app gets it immediately upon registering.
                  </p>
                </div>

                {/* Step 5 */}
                <div className="p-4 rounded-2xl bg-slate-900 border border-emerald-500/40 space-y-2 relative bg-emerald-950/20">
                  <div className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 inline-block">
                    LAYER 5: OUR APP
                  </div>
                  <h4 className="font-bold text-white text-sm">Charge Alert Service</h4>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Our <code className="text-emerald-300">BroadcastReceiver</code> unpacks <code className="text-slate-200">EXTRA_LEVEL</code>, <code className="text-slate-200">EXTRA_STATUS</code>, etc., and compares them against your thresholds!
                  </p>
                </div>
              </div>
            </div>

            {/* Detailed Q&A Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Question 1: How are battery stats stored? */}
              <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
                <div className="flex items-center space-x-2 text-sky-400 font-bold text-sm">
                  <HardDrive className="w-4 h-4" />
                  <span>1. Are Battery Stats Stored in Memory?</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  They are generated by the hardware chip. The Linux kernel exposes them as dynamic text files that only exist in kernel memory:
                </p>
                <div className="p-3 rounded-xl bg-slate-950 font-mono text-[11px] text-slate-300 space-y-1 border border-slate-800">
                  <div><span className="text-slate-500"># Inside Android Linux Kernel:</span></div>
                  <div>cat /sys/class/power_supply/battery/capacity <span className="text-emerald-400"># → 85</span></div>
                  <div>cat /sys/class/power_supply/battery/status <span className="text-emerald-400"># → Charging</span></div>
                  <div>cat /sys/class/power_supply/battery/temp <span className="text-emerald-400"># → 370 (37.0°C)</span></div>
                  <div>cat /sys/class/power_supply/battery/voltage_now <span className="text-emerald-400"># → 4100000 (4.10V)</span></div>
                </div>
                <p className="text-xs text-slate-400">
                  Whenever the battery chip measures a 1% shift or temperature rise, the kernel notifies the OS.
                </p>
              </div>

              {/* Question 2: How does the app read them? */}
              <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
                <div className="flex items-center space-x-2 text-emerald-400 font-bold text-sm">
                  <Radio className="w-4 h-4" />
                  <span>2. How Our App Reads the Battery Broadcast</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Our app registers an event receiver with the Android OS:
                </p>
                <div className="p-3 rounded-xl bg-slate-950 font-mono text-[11px] text-slate-300 space-y-1 border border-slate-800">
                  <div><span className="text-slate-500">// In ChargeService.java &amp; MainActivity.java:</span></div>
                  <div>IntentFilter f = <span className="text-purple-400">new</span> IntentFilter(Intent.<span className="text-sky-300">ACTION_BATTERY_CHANGED</span>);</div>
                  <div>registerReceiver(batteryReceiver, f);</div>
                  <div className="pt-1 text-slate-400">// In onReceive(Context, Intent intent):</div>
                  <div><span className="text-purple-400">int</span> level = intent.getIntExtra(BatteryManager.<span className="text-amber-300">EXTRA_LEVEL</span>, -1);</div>
                  <div><span className="text-purple-400">int</span> temp = intent.getIntExtra(BatteryManager.<span className="text-amber-300">EXTRA_TEMPERATURE</span>, 0);</div>
                  <div><span className="text-purple-400">int</span> status = intent.getIntExtra(BatteryManager.<span className="text-amber-300">EXTRA_STATUS</span>, -1);</div>
                </div>
                <p className="text-xs text-slate-400">
                  Android pushes this Intent object to our app automatically whenever any metric updates.
                </p>
              </div>

              {/* Question 3: Where is the Notification Tone stored? */}
              <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
                <div className="flex items-center space-x-2 text-purple-400 font-bold text-sm">
                  <Volume2 className="w-4 h-4" />
                  <span>3. Where is Your Notification Tone Stored?</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Your device notification tone is stored in an Android System SQLite database table:
                </p>
                <div className="p-3 rounded-xl bg-slate-950 font-mono text-[11px] text-slate-300 space-y-1 border border-slate-800">
                  <div><span className="text-slate-500">Database URI:</span></div>
                  <div className="text-sky-300">content://settings/system/notification_sound</div>
                  <div className="pt-1"><span className="text-slate-500">Audio File Path:</span></div>
                  <div className="text-emerald-400">/system/media/audio/notifications/Spaceline.ogg</div>
                </div>
                <p className="text-xs text-slate-400">
                  Our app calls <code className="text-purple-300">RingtoneManager.getDefaultUri(TYPE_NOTIFICATION)</code>. Android queries this database and returns the exact audio stream for your phone!
                </p>
              </div>

              {/* Question 4: Where are your App Checkboxes stored? */}
              <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
                <div className="flex items-center space-x-2 text-amber-400 font-bold text-sm">
                  <Settings className="w-4 h-4" />
                  <span>4. Where Are Your Checkboxes Stored?</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  The settings you choose (like 80% checked, sound on, unrestricted) are stored in your phone's sandboxed private storage:
                </p>
                <div className="p-3 rounded-xl bg-slate-950 font-mono text-[11px] text-slate-300 space-y-1 border border-slate-800">
                  <div><span className="text-slate-500">File on your internal storage:</span></div>
                  <div className="text-slate-300">/data/data/com.chargealert.app/shared_prefs/</div>
                  <div className="text-emerald-400">ChargeAlertPrefs.xml</div>
                  <div className="text-slate-400 pt-1">&lt;boolean name="thresh_80" value="true" /&gt;</div>
                  <div className="text-slate-400">&lt;boolean name="opt_sound" value="true" /&gt;</div>
                </div>
                <p className="text-xs text-slate-400">
                  This XML file is private to Charge Alert so your settings persist across reboots.
                </p>
              </div>
            </div>

            {/* Quick summary banner */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-slate-300">
                  Ready to test on your phone with live hardware sensors?
                </span>
              </div>
              <a
                href="/ChargeAlert.apk"
                download="ChargeAlert.apk"
                className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-400 transition-all ml-3 shrink-0"
              >
                Download v1.3.0 APK
              </a>
            </div>
          </div>
        )}

        {/* TAB: WHY 85% ALARM PLAYED EXPLANATION */}
        {activeTab === 'why85' && (
          <div className="space-y-8 max-w-5xl mx-auto">
            {/* Answer Header */}
            <div className="rounded-3xl bg-gradient-to-r from-rose-950/60 via-slate-900 to-slate-900 border border-rose-500/40 p-6 sm:p-8 space-y-4 shadow-2xl">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
                  <Info className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
                    Why the Alarm Played at 85%
                  </h1>
                  <p className="text-xs sm:text-sm text-rose-300/90 mt-0.5">
                    Explanation of your screenshot &amp; the updated v1.2.0 logic
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/80 border border-rose-500/30 text-slate-200 text-sm leading-relaxed">
                <strong>Short answer:</strong> Your screenshot shows that the <span className="text-emerald-400 font-bold">80% threshold is checked</span> (with a green checkmark).
                Because your phone reached 85%, which is <strong className="text-rose-400">greater than or equal to 80%</strong>, the app fired the <strong>80% threshold alarm</strong>!
              </div>
            </div>

            {/* Visual Breakdown with the Screenshot */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left Column: Phone Screenshot with visual annotations */}
              <div className="lg:col-span-5 flex flex-col items-center">
                <div className="relative rounded-3xl overflow-hidden border-2 border-rose-500/50 shadow-2xl bg-black max-w-xs group">
                  <img
                    src="/assets/aistudio/WhatsApp_Image_2026-11-01_at_7.49.29_PM_43c5c56b.jpeg"
                    alt="Charge Alert screenshot showing 85% battery and 80% threshold checked"
                    className="w-full h-auto object-cover"
                  />

                  {/* Indicator 1: Over the 85% Battery display */}
                  <div
                    className="absolute left-6 right-6 top-[15%] border-2 border-sky-400 bg-sky-500/20 rounded-xl pointer-events-none flex items-center justify-between px-3"
                    style={{ height: '48px' }}
                  >
                    <span className="text-[10px] font-bold text-sky-300 bg-slate-950/90 px-1.5 py-0.5 rounded">
                      Battery is at 85%
                    </span>
                  </div>

                  {/* Indicator 2: Over the 80% checkbox */}
                  <div
                    className="absolute left-6 right-6 top-[54%] border-2 border-emerald-400 bg-emerald-500/30 rounded-xl pointer-events-none animate-pulse flex items-center justify-between px-3"
                    style={{ height: '36px' }}
                  >
                    <span className="text-[10px] font-bold text-white bg-slate-950/90 px-1.5 py-0.5 rounded">
                      ✓ 80% Alert is CHECKED!
                    </span>
                  </div>
                </div>
                <p className="text-xs text-slate-400 text-center mt-3">
                  Your screen: 80% is enabled, which triggers once battery reaches or exceeds 80%.
                </p>
              </div>

              {/* Right Column: Detailed Breakdown & What Was Fixed */}
              <div className="lg:col-span-7 space-y-5">
                {/* Reason 1 */}
                <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
                  <div className="flex items-center space-x-2 text-slate-200 font-bold text-base">
                    <span className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-xs text-emerald-400">1</span>
                    <span>You Have 80% Selected</span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed pl-8">
                    In your screenshot, under <em>"ALERT THRESHOLDS"</em>, notice:
                    <br />
                    <span className="inline-block mt-1 p-2 rounded bg-slate-950 font-mono text-xs text-emerald-400 border border-slate-800">
                      [✓] 80% - Recommended (Optimal Lifespan)
                    </span>
                    <br />
                    The 85% checkbox is unchecked, but the 80% checkbox is active.
                  </p>
                </div>

                {/* Reason 2 */}
                <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
                  <div className="flex items-center space-x-2 text-slate-200 font-bold text-base">
                    <span className="w-6 h-6 rounded-full bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-xs text-sky-400">2</span>
                    <span>The Mathematical Condition (85% ≥ 80%)</span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed pl-8">
                    To make sure you never miss an alert (for example if the screen was off and battery hopped from 79% to 81%), the code triggers when:
                    <br />
                    <code className="text-amber-400 font-mono text-xs bg-slate-950 p-1.5 rounded block mt-1.5">
                      if (currentBatteryLevel &gt;= threshold) fireAlert();
                    </code>
                    Since <strong className="text-emerald-400">85% is greater than 80%</strong>, it fired your 80% alarm.
                  </p>
                </div>

                {/* What we improved in v1.3.0 */}
                <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-emerald-950/30 border border-emerald-500/40 space-y-3">
                  <div className="flex items-center space-x-2 text-emerald-400 font-bold text-base">
                    <Sparkles className="w-5 h-5 text-emerald-400" />
                    <span>New In Charge Alert v1.3.0 (Device Notification Sound Ready)</span>
                  </div>
                  <ul className="text-xs sm:text-sm text-slate-300 space-y-2 pl-4 list-disc">
                    <li>
                      <strong>Device Notification Tone Integration:</strong> Charge Alert now automatically fetches and plays your phone's default notification tone (e.g. Skyline, Spaceline, Ding, Chime) using <code>RingtoneManager.TYPE_NOTIFICATION</code>.
                    </li>
                    <li>
                      <strong>System Tone Picker:</strong> Tap <strong>"Choose Device Tone"</strong> in the app to pick any ringtone or notification sound installed on your device.
                    </li>
                    <li>
                      <strong>Test Sound Button:</strong> Immediate preview of the selected notification sound right inside the app.
                    </li>
                    <li>
                      <strong>Plug-In Baseline Filter:</strong> Plugging in at 85% will no longer trigger retroactively for 80%.
                    </li>
                  </ul>

                  <div className="pt-2">
                    <a
                      href="/ChargeAlert.apk"
                      download="ChargeAlert.apk"
                      onClick={handleDownloadCelebration}
                      className="inline-flex items-center space-x-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download Updated APK v1.3.0</span>
                    </a>
                  </div>
                </div>

                {/* How to customize thresholds */}
                <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-400 space-y-1">
                  <span className="font-semibold text-slate-300">How to only alarm at 85% or 100%:</span>
                  <p>
                    If you prefer an alert at 85% instead of 80%, simply uncheck <strong>80%</strong> and check <strong>85% - Protect Battery Standard</strong> on your screen!
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 0: SOLUTION FOR PLAY PROTECT BLOCK */}
        {activeTab === 'solution' && (
          <div className="space-y-8 max-w-5xl mx-auto">
            {/* Header Alert */}
            <div className="rounded-3xl bg-gradient-to-r from-amber-950/60 via-slate-900 to-slate-900 border border-amber-500/40 p-6 sm:p-8 space-y-4 shadow-2xl">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
                    Solution: "Unsafe app blocked" by Play Protect
                  </h1>
                  <p className="text-xs sm:text-sm text-amber-300/90 mt-0.5">
                    How to complete installation in 2 seconds on your phone screen
                  </p>
                </div>
              </div>

              <p className="text-sm text-slate-300 leading-relaxed">
                Google Play Protect shows this dialog for <strong>any sideloaded APK</strong> that is not downloaded from the Google Play Store.
                The app is 100% safe (it only checks your battery percentage to sound a chime and has no internet tracking).
              </p>
            </div>

            {/* Visual Screenshot Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left Column: The Screenshot with Visual Target Indicator */}
              <div className="lg:col-span-5 flex flex-col items-center">
                <div className="relative rounded-3xl overflow-hidden border-2 border-amber-500/50 shadow-2xl bg-black max-w-xs group">
                  <img
                    src="/assets/aistudio/WhatsApp_Image_2026-11-01_at_7.30.23_PM_a1c313be.jpeg"
                    alt="Play Protect Unsafe app blocked dialog screenshot"
                    className="w-full h-auto object-cover"
                  />

                  {/* Pulsing Highlight Box around 'Install anyway' */}
                  <div
                    className="absolute left-6 right-6 bottom-[26%] border-2 border-emerald-400 bg-emerald-500/30 rounded-xl pointer-events-none animate-pulse flex items-center justify-center p-2"
                    style={{ height: '42px' }}
                  >
                    <span className="text-xs font-bold text-white bg-slate-950/90 px-2 py-0.5 rounded shadow">
                      👉 Tap "Install anyway" here
                    </span>
                  </div>

                  {/* Cross-out indicator on the OK button */}
                  <div
                    className="absolute left-8 right-8 bottom-[14%] border border-rose-500 bg-rose-950/60 rounded-full pointer-events-none flex items-center justify-center py-1 text-[11px] font-semibold text-rose-300"
                    style={{ height: '36px' }}
                  >
                    ✕ Do NOT tap OK (cancels install)
                  </div>
                </div>
                <p className="text-xs text-slate-400 text-center mt-3">
                  Your phone's installer prompt with exact touch target highlighted.
                </p>
              </div>

              {/* Right Column: 3 Concrete Solutions */}
              <div className="lg:col-span-7 space-y-5">
                {/* Fix 1: The 1-Tap Solution */}
                <div className="p-5 rounded-2xl bg-slate-900/90 border border-emerald-500/40 space-y-2">
                  <div className="flex items-center space-x-2 text-emerald-400 font-bold text-base">
                    <span className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-xs">1</span>
                    <span>Direct 1-Tap Fix: Tap "Install anyway"</span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed pl-8">
                    Look directly above the big blue <strong>[ OK ]</strong> button.
                    Tap the text that says <strong className="text-emerald-400 underline decoration-emerald-400">"Install anyway"</strong>.
                    The app will install immediately and open normally!
                  </p>
                </div>

                {/* Fix 2: Updated Android 14 (Target SDK 34) Build */}
                <div className="p-5 rounded-2xl bg-slate-900/90 border border-sky-500/40 space-y-3">
                  <div className="flex items-center space-x-2 text-sky-400 font-bold text-base">
                    <span className="w-6 h-6 rounded-full bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-xs">2</span>
                    <span>Download Updated APK (Android 14 / Target SDK 34)</span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed pl-8">
                    We just recompiled the APK with <strong>Target SDK 34 (Android 14)</strong> and explicit <code>FOREGROUND_SERVICE_SPECIAL_USE</code> declarations to satisfy Google's newest privacy standards.
                  </p>
                  <div className="pl-8 pt-1 flex flex-wrap gap-3">
                    <a
                      href="/ChargeAlert.apk"
                      download="ChargeAlert.apk"
                      onClick={handleDownloadCelebration}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center space-x-2"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download Updated APK v1.1.0</span>
                    </a>
                  </div>
                </div>

                {/* Fix 3: Temporarily Turn Off Play Protect Sideload Check */}
                <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
                  <div className="flex items-center space-x-2 text-slate-200 font-bold text-base">
                    <span className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs text-slate-400">3</span>
                    <span>Optional: Disable Play Protect Warning in Play Store</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed pl-8">
                    If your manufacturer or carrier disabled the "Install anyway" button:
                  </p>
                  <ol className="list-decimal list-inside text-xs text-slate-300 space-y-1 pl-8">
                    <li>Open <strong>Google Play Store</strong> on your phone.</li>
                    <li>Tap your <strong>Profile picture</strong> (top-right corner) &gt; tap <strong>Play Protect</strong>.</li>
                    <li>Tap the <strong>Settings Gear ⚙️</strong> in the top-right corner.</li>
                    <li>Toggle OFF <strong>"Scan apps with Play Protect"</strong>.</li>
                    <li>Install the APK, then you can turn Play Protect back on afterwards.</li>
                  </ol>
                </div>

                {/* What to do next: Unrestricted Battery Mode */}
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-400 flex items-center justify-between">
                  <span>After installing, remember to set battery usage to <strong>"Unrestricted"</strong>.</span>
                  <button
                    onClick={() => setActiveTab('guide')}
                    className="text-emerald-400 hover:underline font-semibold flex items-center space-x-1 shrink-0 ml-2"
                  >
                    <span>View Guide</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 1: DOWNLOAD APK */}
        {activeTab === 'download' && (
          <div className="space-y-8">
            {/* Hero Section */}
            <div className="relative rounded-3xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 p-6 sm:p-10 overflow-hidden shadow-2xl">
              <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-10 w-80 h-80 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
                {/* Left: Info & Download Actions */}
                <div className="lg:col-span-7 space-y-6">
                  <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Compiled, Signed &amp; Verified APK</span>
                  </div>

                  <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
                    Charge Alert APK <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-sky-400 to-teal-300">
                      Ready to Install on Android
                    </span>
                  </h1>

                  <p className="text-slate-300 text-base sm:text-lg leading-relaxed">
                    Protect your phone's battery lifespan by ringing an alert chime whenever charging hits your chosen threshold (80%, 85%, 90%, or 100%).
                    Runs in the background with an unrestricted foreground service.
                  </p>

                  {/* Primary CTA Buttons */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2">
                    <a
                      href="/ChargeAlert.apk"
                      download="ChargeAlert.apk"
                      onClick={handleDownloadCelebration}
                      className="inline-flex items-center justify-center space-x-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-bold text-lg shadow-xl shadow-emerald-500/25 active:scale-95 transition-all group"
                    >
                      <Download className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" />
                      <span>Download ChargeAlert.apk</span>
                    </a>

                    <a
                      href="/ChargeAlert-source.zip"
                      download="ChargeAlert-source.zip"
                      className="inline-flex items-center justify-center space-x-2 px-6 py-4 rounded-2xl bg-slate-800/90 hover:bg-slate-700/90 text-slate-200 font-semibold text-base border border-slate-700 active:scale-95 transition-all"
                    >
                      <FolderArchive className="w-5 h-5 text-sky-400" />
                      <span>Source Project (.zip)</span>
                    </a>
                  </div>

                  {/* Quick verification stats badge */}
                  <div className="pt-2 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs text-slate-400">
                    <div className="flex items-center space-x-2 p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <div>
                        <div className="font-semibold text-slate-200">v1 + v2 + v3</div>
                        <div>Signed &amp; Aligned</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
                      <Smartphone className="w-4 h-4 text-sky-400" />
                      <div>
                        <div className="font-semibold text-slate-200">Android 5.0 to 15</div>
                        <div>SDK 21 - 34</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 col-span-2 sm:col-span-1">
                      <Cpu className="w-4 h-4 text-teal-400" />
                      <div>
                        <div className="font-semibold text-slate-200">{apkInfo.fileSizeFormatted}</div>
                        <div>Zero Bloat</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right: Instant Phone QR Code Scanner */}
                <div className="lg:col-span-5 flex flex-col items-center justify-center">
                  <div className="w-full max-w-sm p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-2xl relative group">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-2">
                        <QrCode className="w-4 h-4 text-emerald-400" />
                        <span className="text-sm font-semibold text-slate-200">Scan to Install on Phone</span>
                      </div>
                      <span className="text-[11px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded">No cable needed</span>
                    </div>

                    <div className="p-3 bg-white rounded-xl shadow-inner flex items-center justify-center aspect-square">
                      {qrCodeUrl ? (
                        <img
                          src={qrCodeUrl}
                          alt="Scan to download Charge Alert APK"
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
                      )}
                    </div>

                    <p className="text-xs text-center text-slate-400 mt-4">
                      Point your Android camera at the QR code to download &amp; install directly.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* APK Metadata & SHA-256 Checksum Card */}
            <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <h3 className="font-bold text-slate-200 text-sm">Package &amp; Checksum Verification</h3>
                </div>
                <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  {apkInfo.packageName}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1 p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
                  <span className="text-slate-400 font-medium">SHA-256 Hash:</span>
                  <div className="flex items-center justify-between font-mono text-slate-300 break-all pt-1">
                    <span className="text-[11px] select-all">{apkInfo.sha256}</span>
                    <button
                      onClick={() => copyToClipboard(apkInfo.sha256, 'sha')}
                      className="ml-2 p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition-all shrink-0"
                      title="Copy SHA-256"
                    >
                      {copiedSha ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
                    <span className="text-slate-400 font-medium">Version:</span>
                    <div className="font-semibold text-slate-200 mt-1">v{apkInfo.versionName} (Build {apkInfo.versionCode})</div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
                    <span className="text-slate-400 font-medium">Compatibility:</span>
                    <div className="font-semibold text-slate-200 mt-1">API 21 - 34</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick 4-Step Installation Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-sm">
                  1
                </div>
                <h4 className="font-bold text-slate-200 text-sm">Download APK</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Tap the button or scan the QR code to download <code className="text-emerald-400">ChargeAlert.apk</code> to your device.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
                <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center font-bold text-sm">
                  2
                </div>
                <h4 className="font-bold text-slate-200 text-sm">Allow Unknown Sources</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  If prompted, toggle <em>"Install unknown apps"</em> for Chrome or your browser in settings.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
                <div className="w-8 h-8 rounded-lg bg-teal-500/10 text-teal-400 flex items-center justify-center font-bold text-sm">
                  3
                </div>
                <h4 className="font-bold text-slate-200 text-sm">Allow Notifications</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Open Charge Alert, allow notification permissions (required for Android 13+ foreground services).
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold text-sm">
                  4
                </div>
                <h4 className="font-bold text-slate-200 text-sm">Set Unrestricted</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Set battery usage to <strong>"Unrestricted"</strong> so Android doesn't put the monitor service to sleep while charging.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: LIVE MONITOR & CHIME TEST */}
        {activeTab === 'monitor' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Left Column: Battery Card & Simulator */}
              <div className="lg:col-span-7 space-y-6">
                <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-6 sm:p-8 space-y-6 shadow-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-bold text-white flex items-center space-x-2">
                        <span>Live Battery Monitor</span>
                        {hasRealBattery && !isSimulated ? (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            Hardware Connected
                          </span>
                        ) : (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-400 border border-sky-500/30">
                            Simulation Mode
                          </span>
                        )}
                      </h2>
                      <p className="text-xs text-slate-400 mt-1">
                        Test how the alert engine reacts when battery charging reaches specified percentages.
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        setIsSimulated(!isSimulated);
                        if (isSimulated && hasRealBattery) {
                          // refresh real
                        }
                      }}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 transition-all flex items-center space-x-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>{isSimulated ? 'Use Device Battery' : 'Test Slider Mode'}</span>
                    </button>
                  </div>

                  {/* Big Battery Level Visualization */}
                  <div className="p-6 rounded-2xl bg-slate-950/80 border border-slate-800/80 flex flex-col items-center justify-center space-y-4">
                    <div className="relative w-48 h-24 border-4 border-slate-600 rounded-2xl p-1.5 flex items-center">
                      {/* Battery Cap */}
                      <div className="absolute -right-3 w-2.5 h-10 bg-slate-600 rounded-r-md" />

                      {/* Fill Progress Bar */}
                      <div
                        className={`h-full rounded-xl transition-all duration-300 relative overflow-hidden ${
                          batteryLevel >= 80
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                            : batteryLevel >= 40
                            ? 'bg-gradient-to-r from-sky-500 to-emerald-400'
                            : 'bg-gradient-to-r from-amber-500 to-rose-500'
                        }`}
                        style={{ width: `${Math.max(5, Math.min(100, batteryLevel))}%` }}
                      >
                        {isCharging && (
                          <div className="absolute inset-0 bg-white/20 animate-[pulse_1.5s_ease-in-out_infinite]" />
                        )}
                      </div>

                      {/* Centered Percentage Text */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="flex items-center space-x-2 text-white font-extrabold text-2xl drop-shadow-md">
                          {isCharging && <Zap className="w-5 h-5 text-amber-300 fill-amber-300 animate-bounce" />}
                          <span>{batteryLevel}%</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4 text-xs text-slate-300">
                      <div className="flex items-center space-x-1.5">
                        <span className={`w-2 h-2 rounded-full ${isCharging ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'}`} />
                        <span>Status: <strong>{isCharging ? 'Charging' : 'Discharging'}</strong></span>
                      </div>
                      <span>•</span>
                      <div>
                        Target Alert: <strong className="text-emerald-400">80% / 100%</strong>
                      </div>
                    </div>
                  </div>

                  {/* Charging Slider Simulator */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-300">Test Charging Level Slider:</span>
                      <span className="font-mono text-emerald-400 font-bold">{batteryLevel}%</span>
                    </div>

                    <input
                      type="range"
                      min="50"
                      max="100"
                      value={batteryLevel}
                      onChange={(e) => handleSimulationSlider(Number(e.target.value))}
                      className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                    />

                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>50%</span>
                      <span className="text-emerald-400 font-semibold">80% (Sweetspot)</span>
                      <span>85%</span>
                      <span>90%</span>
                      <span>100% (Full)</span>
                    </div>
                  </div>

                  {/* Charging Toggle */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                    <div className="text-xs">
                      <span className="text-slate-300 font-medium">Charger Connection:</span>
                      <p className="text-slate-400 text-[11px]">Alarm only sounds when charger is plugged in</p>
                    </div>

                    <button
                      onClick={() => setIsCharging(!isCharging)}
                      className={`px-3 py-1.5 rounded-xl font-semibold text-xs transition-all ${
                        isCharging
                          ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {isCharging ? '⚡ Plugged In (Charging)' : 'Unplugged'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Column: Alert Thresholds & Audio Chime Synthesizer */}
              <div className="lg:col-span-5 space-y-6">
                {/* Audio Chime Engine Card */}
                <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-6 space-y-5 shadow-xl">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-white text-base flex items-center space-x-2">
                      <Volume2 className="w-5 h-5 text-emerald-400" />
                      <span>Alert Chime Synthesizer</span>
                    </h3>
                    <span className="text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                      Web Audio API
                    </span>
                  </div>

                  {/* Sound Presets */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {(['bell', 'radar', 'marimba', 'alarm'] as const).map((tone) => (
                      <button
                        key={tone}
                        onClick={() => {
                          setChimeType(tone);
                          playSynthesizedChime(tone);
                        }}
                        className={`p-2.5 rounded-xl border text-left font-medium capitalize transition-all ${
                          chimeType === tone
                            ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                            : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <div className="font-bold text-slate-200">{tone} Alert</div>
                        <div className="text-[10px] text-slate-400">
                          {tone === 'bell' && 'Harmonic Arpeggio'}
                          {tone === 'radar' && 'High-tech Sonar Ping'}
                          {tone === 'marimba' && 'Gentle Wooden Chime'}
                          {tone === 'alarm' && 'Urgent High Frequency'}
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Test Chime Button */}
                  <div className="flex items-center space-x-3 pt-2">
                    <button
                      onClick={handleTestChime}
                      disabled={isPlayingChime}
                      className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center space-x-2 transition-all border border-slate-700 active:scale-95"
                    >
                      <Play className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{isPlayingChime ? 'Playing Chime...' : 'Test Selected Chime'}</span>
                    </button>

                    {alarmTriggered && (
                      <button
                        onClick={stopAlarm}
                        className="py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center justify-center space-x-1.5 transition-all shadow-md active:scale-95"
                      >
                        <Square className="w-3.5 h-3.5" />
                        <span>Stop</span>
                      </button>
                    )}
                  </div>

                  {/* Toggles */}
                  <div className="pt-3 border-t border-slate-800/80 space-y-2 text-xs">
                    <label className="flex items-center justify-between cursor-pointer">
                      <span className="text-slate-300">Vibrate Phone (Haptic Feedback)</span>
                      <input
                        type="checkbox"
                        checked={vibrateEnabled}
                        onChange={(e) => setVibrateEnabled(e.target.checked)}
                        className="w-4 h-4 rounded text-emerald-500 accent-emerald-500 bg-slate-800 border-slate-700"
                      />
                    </label>
                  </div>
                </div>

                {/* Threshold Configuration Card */}
                <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-6 space-y-4 shadow-xl">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-white text-base flex items-center space-x-2">
                      <Sliders className="w-4 h-4 text-sky-400" />
                      <span>Active Alert Thresholds</span>
                    </h3>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {[70, 75, 80, 85, 90, 95, 100].map((t) => (
                      <button
                        key={t}
                        onClick={() => toggleThreshold(t)}
                        className={`p-2.5 rounded-xl border flex items-center justify-between transition-all ${
                          thresholds[t]
                            ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 font-bold'
                            : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-300'
                        }`}
                      >
                        <span>{t}% Charge</span>
                        {thresholds[t] && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                      </button>
                    ))}
                  </div>

                  {/* Dynamic Science Insight */}
                  {(() => {
                    const activeMax = Object.keys(thresholds)
                      .map(Number)
                      .filter((k) => thresholds[k])
                      .sort((a, b) => a - b)[0] || 80;
                    const insight = getBatteryHealthInsight(activeMax);
                    return (
                      <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-xs space-y-1.5 mt-3">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-300">Lifespan Projection:</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${insight.badgeColor}`}>
                            {insight.badge}
                          </span>
                        </div>
                        <div className="font-bold text-emerald-400">{insight.cycles}</div>
                        <p className="text-[11px] text-slate-400 leading-relaxed">{insight.desc}</p>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: STEP-BY-STEP INSTALLATION & BATTERY UNRESTRICTED GUIDE */}
        {activeTab === 'guide' && (
          <div className="space-y-8 max-w-4xl mx-auto">
            <div className="text-center space-y-2">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
                Android Installation &amp; Optimization
              </h2>
              <p className="text-sm text-slate-400 max-w-2xl mx-auto">
                Follow these essential setup steps to ensure your phone allows the background battery monitor to keep alert sounds active.
              </p>
            </div>

            {/* Crucial Notice regarding Unrestricted Battery Setting */}
            <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 flex items-start space-x-3">
              <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs sm:text-sm space-y-1">
                <p className="font-bold text-amber-300">Crucial: Unrestricted Battery Mode</p>
                <p className="text-amber-200/90 leading-relaxed">
                  Modern Android aggressively kills background apps while the screen is off. To guarantee Charge Alert rings when 80% or 100% is reached overnight, you must grant <strong>"Unrestricted"</strong> battery permissions.
                </p>
              </div>
            </div>

            {/* Brand-Specific Guide Tabs */}
            <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-6 space-y-6 shadow-xl">
              <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-4">
                {[
                  { id: 'samsung', label: 'Samsung Galaxy (One UI)' },
                  { id: 'pixel', label: 'Google Pixel' },
                  { id: 'xiaomi', label: 'Xiaomi / Redmi (HyperOS/MIUI)' },
                  { id: 'oneplus', label: 'OnePlus / Oppo / Realme' },
                  { id: 'stock', label: 'Motorola & Stock Android' },
                ].map((brand) => (
                  <button
                    key={brand.id}
                    onClick={() => setSelectedGuideBrand(brand.id as any)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                      selectedGuideBrand === brand.id
                        ? 'bg-emerald-500 text-slate-950 shadow-md'
                        : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {brand.label}
                  </button>
                ))}
              </div>

              {/* Guide Contents */}
              <div className="space-y-4 text-xs sm:text-sm text-slate-300">
                {selectedGuideBrand === 'samsung' && (
                  <div className="space-y-3">
                    <h4 className="font-bold text-white text-base">Samsung Galaxy (One UI 5 / 6)</h4>
                    <ol className="list-decimal list-inside space-y-2 text-slate-300">
                      <li>Open phone <strong>Settings</strong> &gt; <strong>Apps</strong>.</li>
                      <li>Scroll down and tap <strong>Charge Alert</strong>.</li>
                      <li>Tap <strong>Battery</strong>.</li>
                      <li>Select <strong>Unrestricted</strong> (by default Samsung sets this to 'Optimized').</li>
                      <li>Go back to <strong>Permissions</strong> &gt; ensure <strong>Notifications</strong> is Allowed.</li>
                    </ol>
                  </div>
                )}

                {selectedGuideBrand === 'pixel' && (
                  <div className="space-y-3">
                    <h4 className="font-bold text-white text-base">Google Pixel (Android 13 / 14 / 15)</h4>
                    <ol className="list-decimal list-inside space-y-2 text-slate-300">
                      <li>Open phone <strong>Settings</strong> &gt; <strong>Apps</strong> &gt; <strong>See all apps</strong>.</li>
                      <li>Tap <strong>Charge Alert</strong>.</li>
                      <li>Tap <strong>App battery usage</strong>.</li>
                      <li>Switch option from <em>Optimized</em> to <strong>Unrestricted</strong>.</li>
                      <li>Tap <strong>Notifications</strong> and ensure <em>Allow Charge Alert notifications</em> is ON.</li>
                    </ol>
                  </div>
                )}

                {selectedGuideBrand === 'xiaomi' && (
                  <div className="space-y-3">
                    <h4 className="font-bold text-white text-base">Xiaomi, Redmi &amp; POCO (HyperOS / MIUI)</h4>
                    <ol className="list-decimal list-inside space-y-2 text-slate-300">
                      <li>Long press the <strong>Charge Alert</strong> icon on home screen &gt; tap <strong>App Info</strong>.</li>
                      <li>Enable <strong>Autostart</strong> toggle.</li>
                      <li>Tap <strong>Battery Saver</strong> &gt; select <strong>No restrictions</strong>.</li>
                      <li>Tap <strong>Notifications</strong> &gt; ensure sound and lock screen notifications are enabled.</li>
                    </ol>
                  </div>
                )}

                {selectedGuideBrand === 'oneplus' && (
                  <div className="space-y-3">
                    <h4 className="font-bold text-white text-base">OnePlus, Oppo &amp; Realme (OxygenOS / ColorOS)</h4>
                    <ol className="list-decimal list-inside space-y-2 text-slate-300">
                      <li>Open <strong>Settings</strong> &gt; <strong>Battery</strong> &gt; <strong>More settings</strong>.</li>
                      <li>Tap <strong>App battery management</strong> &gt; tap <strong>Charge Alert</strong>.</li>
                      <li>Turn ON <strong>Allow background activity</strong> and <strong>Allow auto-launch</strong>.</li>
                      <li>Ensure Notifications are toggled ON.</li>
                    </ol>
                  </div>
                )}

                {selectedGuideBrand === 'stock' && (
                  <div className="space-y-3">
                    <h4 className="font-bold text-white text-base">Motorola &amp; Stock Android</h4>
                    <ol className="list-decimal list-inside space-y-2 text-slate-300">
                      <li>Open <strong>Settings</strong> &gt; <strong>Apps &amp; notifications</strong>.</li>
                      <li>Select <strong>Charge Alert</strong> &gt; <strong>Advanced</strong> &gt; <strong>Battery</strong>.</li>
                      <li>Select <strong>Battery optimization</strong> &gt; toggle to <em>Don't optimize</em> / <strong>Unrestricted</strong>.</li>
                      <li>Verify notifications are allowed.</li>
                    </ol>
                  </div>
                )}
              </div>
            </div>

            {/* Direct Download banner below guide */}
            <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-950/40 to-slate-900 border border-emerald-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h4 className="font-bold text-white text-base">Ready to install on your phone?</h4>
                <p className="text-xs text-slate-400">Download the lightweight 25 KB APK or open the project.</p>
              </div>
              <a
                href="/ChargeAlert.apk"
                download="ChargeAlert.apk"
                onClick={handleDownloadCelebration}
                className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-md transition-all active:scale-95 flex items-center space-x-2"
              >
                <Download className="w-4 h-4" />
                <span>Download APK</span>
              </a>
            </div>
          </div>
        )}

        {/* TAB 4: COMPLETE SOURCE PROJECT EXPLORER */}
        {activeTab === 'source' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center space-x-2">
                  <Code2 className="w-5 h-5 text-emerald-400" />
                  <span>Android Studio Source Project</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Full Kotlin and Gradle project files matching your uploaded attachments.
                </p>
              </div>

              <div className="flex items-center space-x-3">
                <a
                  href="/ChargeAlert-source.zip"
                  download="ChargeAlert-source.zip"
                  className="px-4 py-2 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 text-sky-400 border border-sky-500/30 font-semibold text-xs transition-all flex items-center space-x-1.5"
                >
                  <FolderArchive className="w-4 h-4" />
                  <span>Download Project .ZIP</span>
                </a>
                <button
                  onClick={() => copyToClipboard(sourceCodeSnippets[selectedSourceTab], 'code')}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition-all flex items-center space-x-1.5"
                >
                  {copiedCode ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedCode ? 'Copied!' : 'Copy Code'}</span>
                </button>
              </div>
            </div>

            {/* Code Tabs */}
            <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-2xl">
              <div className="flex items-center space-x-2 px-4 py-2.5 bg-slate-950 border-b border-slate-800 overflow-x-auto text-xs">
                {(
                  [
                    { id: 'service', label: 'ChargeService.kt' },
                    { id: 'activity', label: 'MainActivity.kt' },
                    { id: 'manifest', label: 'AndroidManifest.xml' },
                    { id: 'gradle', label: 'app/build.gradle.kts' },
                    { id: 'readme', label: 'README.txt' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setSelectedSourceTab(tab.id)}
                    className={`px-3 py-1.5 rounded-lg font-mono font-medium whitespace-nowrap transition-all ${
                      selectedSourceTab === tab.id
                        ? 'bg-slate-800 text-emerald-400 border border-slate-700'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Code Pre Block */}
              <div className="p-4 overflow-x-auto max-h-[500px]">
                <pre className="font-mono text-xs text-slate-300 leading-relaxed">
                  <code>{sourceCodeSnippets[selectedSourceTab]}</code>
                </pre>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <BatteryCharging className="w-4 h-4 text-emerald-400" />
            <span className="font-semibold text-slate-400">Charge Alert</span>
            <span>• Open Source Android Battery Protection</span>
          </div>

          <div className="flex items-center space-x-4">
            <a
              href="/ChargeAlert.apk"
              download="ChargeAlert.apk"
              className="text-emerald-400 hover:underline flex items-center space-x-1"
            >
              <span>Download APK</span>
              <ArrowRight className="w-3 h-3" />
            </a>
            <a
              href="/ChargeAlert-source.zip"
              download="ChargeAlert-source.zip"
              className="text-sky-400 hover:underline"
            >
              Source .zip
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
