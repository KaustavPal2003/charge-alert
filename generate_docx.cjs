const fs = require('fs');
const path = require('path');
const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  ShadingType
} = require('docx');

async function createWordDocument() {
  const doc = new Document({
    creator: "Charge Alert Engineering",
    title: "How Android Gets Device Information: Architecture & Storage Analysis",
    description: "Comprehensive technical guide on battery metrics, hardware sensors, Linux kernel sysfs, sticky broadcasts, and storage mechanisms in Android.",
    styles: {
      default: {
        document: {
          run: {
            font: "Calibri",
            size: 22, // 11pt
            color: "1E293B",
          },
        },
      },
      paragraphStyles: [
        {
          id: "TitleStyle",
          name: "Title Style",
          run: {
            size: 48, // 24pt
            bold: true,
            color: "0F172A",
            font: "Calibri",
          },
          paragraph: {
            spacing: { after: 120, before: 120 },
            alignment: AlignmentType.CENTER,
          },
        },
        {
          id: "Heading1Style",
          name: "Heading 1 Style",
          run: {
            size: 32, // 16pt
            bold: true,
            color: "0369A1", // Sky-700
            font: "Calibri",
          },
          paragraph: {
            spacing: { before: 360, after: 120 },
          },
        },
        {
          id: "Heading2Style",
          name: "Heading 2 Style",
          run: {
            size: 26, // 13pt
            bold: true,
            color: "0F766E", // Teal-700
            font: "Calibri",
          },
          paragraph: {
            spacing: { before: 240, after: 80 },
          },
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440, // 1 inch
              right: 1440,
              bottom: 1440,
              left: 1440,
            },
          },
        },
        children: [
          // Title
          new Paragraph({
            text: "How Android Gets Device Information",
            style: "TitleStyle",
          }),
          new Paragraph({
            text: "Are Device Stats Stored as Variables? System Architecture, Linux Kernel sysfs, Hardware Sensors, and Storage Mechanisms",
            paragraph: {
              alignment: AlignmentType.CENTER,
              spacing: { after: 360 },
            },
            children: [
              new TextRun({
                text: "Technical Whitepaper & Architecture Overview • Charge Alert Engineering",
                italics: true,
                size: 20,
                color: "64748B",
              }),
            ],
          }),

          // Divider / Callout Box
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    shading: { type: ShadingType.CLEAR, fill: "F0FDF4" },
                    borders: {
                      top: { style: BorderStyle.SINGLE, size: 8, color: "86EFAC" },
                      bottom: { style: BorderStyle.SINGLE, size: 8, color: "86EFAC" },
                      left: { style: BorderStyle.SINGLE, size: 24, color: "16A34A" },
                      right: { style: BorderStyle.SINGLE, size: 8, color: "86EFAC" },
                    },
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({ text: "DIRECT EXECUTIVE SUMMARY:\n", bold: true, color: "15803D" }),
                          new TextRun({
                            text: "No, battery stats (percentage, voltage, temperature, charging status) are NOT static code variables stored in memory or on flash storage. They are live, continuous physical sensor measurements sampled by a dedicated battery management microchip (Fuel Gauge PMIC), translated by Linux kernel drivers into virtual sysfs files, and broadcasted in real-time by the Android OS.\n\nIn contrast, your configuration settings (e.g. 80% threshold checked, sound enabled) ARE stored as persistent variables inside an XML file on your device's internal storage.",
                            size: 21,
                            color: "14532D",
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),

          new Paragraph({ text: "", spacing: { after: 200 } }),

          // Section 1
          new Paragraph({
            text: "1. The 5-Layer Journey (From Battery Cell to Your Screen)",
            style: "Heading1Style",
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "When an app like Charge Alert displays \"85% Charging • 37.0°C • 4100 mV\", that data travels through five distinct hardware and software layers:",
              }),
            ],
          }),

          // Layer 1
          new Paragraph({
            text: "Layer 1: The Hardware Silicon (Fuel Gauge IC & PMIC)",
            style: "Heading2Style",
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "Inside every smartphone, directly adjacent to the Lithium-Ion/Polymer battery cell, is a specialized battery management chip (typically manufactured by Qualcomm, Texas Instruments, Maxim Integrated, or MediaTek). This chip contains:\n",
              }),
              new TextRun({ text: "• High-Precision Coulomb Counter: ", bold: true }),
              new TextRun({ text: "Measures current flowing into and out of the battery cell over time to compute exact state-of-charge.\n" }),
              new TextRun({ text: "• ADC (Analog-to-Digital Converter): ", bold: true }),
              new TextRun({ text: "Measures instant battery cell voltage across terminals (e.g., 3.85V nominal, 4.35V peak).\n" }),
              new TextRun({ text: "• NTC Thermal Resistor (Thermistor): ", bold: true }),
              new TextRun({ text: "A physical resistor whose electrical resistance varies proportionally with heat, measuring real-time battery pack temperature." }),
            ],
          }),

          // Layer 2
          new Paragraph({
            text: "Layer 2: The Linux Kernel Virtual Filesystem (sysfs)",
            style: "Heading2Style",
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "Android runs atop the Linux kernel. The kernel power supply driver communicates with the Fuel Gauge chip via I2C or SPMI bus. Crucially, the Linux kernel exposes these live measurements as virtual pseudo-files in RAM under:\n",
              }),
              new TextRun({ text: "/sys/class/power_supply/battery/\n", bold: true, font: "Consolas", color: "0284C7" }),
              new TextRun({ text: "These files do not exist on your flash drive; reading them triggers the kernel driver to poll the hardware chip:\n" }),
              new TextRun({ text: "• capacity: ", bold: true, font: "Consolas" }),
              new TextRun({ text: "Contains current integer percentage (e.g. \"85\").\n" }),
              new TextRun({ text: "• status: ", bold: true, font: "Consolas" }),
              new TextRun({ text: "Current power state (\"Charging\", \"Discharging\", \"Full\", \"Not charging\").\n" }),
              new TextRun({ text: "• temp: ", bold: true, font: "Consolas" }),
              new TextRun({ text: "Temperature in tenths of a degree Celsius (e.g., \"370\" means 37.0°C).\n" }),
              new TextRun({ text: "• voltage_now: ", bold: true, font: "Consolas" }),
              new TextRun({ text: "Real-time voltage in microvolts (e.g., \"4100000\" = 4.10 Volts).\n" }),
              new TextRun({ text: "• health: ", bold: true, font: "Consolas" }),
              new TextRun({ text: "Physical battery condition (\"Good\", \"Overheat\", \"Dead\", \"Over voltage\")." }),
            ],
          }),

          // Layer 3 & 4
          new Paragraph({
            text: "Layer 3 & 4: Android BatteryService & Sticky Broadcasts",
            style: "Heading2Style",
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "Android runs a system daemon called BatteryService (interfacing with the Health HAL). Whenever the Linux kernel detects a change (e.g., battery moves from 84% to 85% or charger plugged in), BatteryService constructs a system event called a Sticky Broadcast:\n",
              }),
              new TextRun({ text: "Intent.ACTION_BATTERY_CHANGED\n", bold: true, font: "Consolas", color: "7C3AED" }),
              new TextRun({
                text: "Why is it \"Sticky\"? Standard Android broadcasts disappear immediately if no app is listening. A sticky broadcast, however, is kept cached by the Android OS in memory. The exact moment our app registers to listen, Android immediately delivers the last known battery reading without delay.",
              }),
            ],
          }),

          // Layer 5
          new Paragraph({
            text: "Layer 5: App Level Delivery (Charge Alert)",
            style: "Heading2Style",
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "In Charge Alert's source code (ChargeService.java & MainActivity.java), we register a dynamic receiver:\n",
              }),
              new TextRun({
                text: "IntentFilter filter = new IntentFilter(Intent.ACTION_BATTERY_CHANGED);\nregisterReceiver(batteryReceiver, filter);\n",
                font: "Consolas",
                size: 20,
                color: "334155",
              }),
              new TextRun({
                text: "Inside onReceive(Context, Intent intent), we unpack the data using standard Android BatteryManager constants:\n",
              }),
              new TextRun({ text: "• intent.getIntExtra(BatteryManager.EXTRA_LEVEL, -1) → Current battery %\n", font: "Consolas", size: 19 }),
              new TextRun({ text: "• intent.getIntExtra(BatteryManager.EXTRA_STATUS, -1) → Charging vs Discharging\n", font: "Consolas", size: 19 }),
              new TextRun({ text: "• intent.getIntExtra(BatteryManager.EXTRA_PLUGGED, -1) → AC wall adapter vs USB vs Wireless\n", font: "Consolas", size: 19 }),
              new TextRun({ text: "• intent.getIntExtra(BatteryManager.EXTRA_TEMPERATURE, 0) → Battery temperature in 0.1°C\n", font: "Consolas", size: 19 }),
              new TextRun({ text: "• intent.getIntExtra(BatteryManager.EXTRA_VOLTAGE, 0) → Cell millivolts (mV)", font: "Consolas", size: 19 }),
            ],
          }),

          // Section 2: Storage comparison
          new Paragraph({
            text: "2. Are Any Device Metrics Stored As Persistent Variables?",
            style: "Heading1Style",
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "To understand how the phone works, we must distinguish between Dynamic Hardware State and Stored Persistent State:",
              }),
            ],
          }),

          new Paragraph({
            text: "A. Dynamic Hardware State (Not Stored Variables)",
            style: "Heading2Style",
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "Values like battery percentage, temperature, and voltage change continuously. If you turn off your phone, those numbers are gone from memory. When you power the device back on, the fuel gauge hardware re-measures the battery voltage, re-estimates capacity, and creates fresh readings.",
              }),
            ],
          }),

          new Paragraph({
            text: "B. Stored Variables: Your Checkboxes & App Settings",
            style: "Heading2Style",
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "Your selected options (such as checking 80% threshold, 100% threshold, Sound ON, Vibrate ON, and Unrestricted service) ARE saved as variables in a persistent file on your device's internal storage:\n",
              }),
              new TextRun({
                text: "/data/data/com.chargealert.app/shared_prefs/ChargeAlertPrefs.xml\n",
                bold: true,
                font: "Consolas",
                color: "D97706",
              }),
              new TextRun({
                text: "This is managed through Android's SharedPreferences API. When you tap a checkbox, Android writes an XML structure to flash storage:\n",
              }),
              new TextRun({
                text: "<?xml version='1.0' encoding='utf-8' standalone='yes' ?>\n<map>\n    <boolean name=\"thresh_80\" value=\"true\" />\n    <boolean name=\"thresh_100\" value=\"true\" />\n    <boolean name=\"opt_sound\" value=\"true\" />\n    <boolean name=\"opt_vibrate\" value=\"true\" />\n    <string name=\"custom_tone_title\">Default Notification Sound</string>\n</map>\n",
                font: "Consolas",
                size: 19,
                color: "475569",
              }),
              new TextRun({
                text: "Because this file is stored in your phone's non-volatile flash storage, your preferences remain saved even if you restart your device.",
              }),
            ],
          }),

          // Section 3: Notification Tone
          new Paragraph({
            text: "3. How Does the App Fetch Your Device Notification Tone?",
            style: "Heading1Style",
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "In Charge Alert v1.3.0, the app fetches your phone's notification sound directly from Android's system database:\n\n",
              }),
              new TextRun({ text: "1. Android System Settings Database: ", bold: true }),
              new TextRun({
                text: "Android stores your default notification ringtone in an internal SQLite database at:\n",
              }),
              new TextRun({ text: "content://settings/system/notification_sound\n", font: "Consolas", color: "0284C7" }),
              new TextRun({ text: "2. Querying the Tone: ", bold: true }),
              new TextRun({
                text: "Our app asks Android for this URI via:\n",
              }),
              new TextRun({
                text: "Uri toneUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);\n",
                font: "Consolas",
                color: "7C3AED",
              }),
              new TextRun({
                text: "Android resolves this URI to the actual audio file located on your device's read-only system partition (e.g., /system/media/audio/notifications/Spaceline.ogg).\n\n",
              }),
              new TextRun({ text: "3. User Customization (Choose Device Tone): ", bold: true }),
              new TextRun({
                text: "When you tap \"Choose Device Tone\" in Charge Alert, the app launches RingtoneManager.ACTION_RINGTONE_PICKER. When you select a sound, the URI string is saved into SharedPreferences so Charge Alert always uses your favorite chime.",
              }),
            ],
          }),

          // Section 4: Architecture Summary Table
          new Paragraph({
            text: "4. Comprehensive System Architecture Matrix",
            style: "Heading1Style",
          }),
          new Paragraph({
            text: "The table below summarizes every piece of device information, where it originates, whether it is a stored variable, and its update frequency:",
            spacing: { after: 120 },
          }),

          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              // Header Row
              new TableRow({
                children: [
                  new TableCell({
                    shading: { type: ShadingType.CLEAR, fill: "0F172A" },
                    children: [new Paragraph({ children: [new TextRun({ text: "Data Metric", bold: true, color: "FFFFFF" })] })],
                  }),
                  new TableCell({
                    shading: { type: ShadingType.CLEAR, fill: "0F172A" },
                    children: [new Paragraph({ children: [new TextRun({ text: "Stored Variable?", bold: true, color: "FFFFFF" })] })],
                  }),
                  new TableCell({
                    shading: { type: ShadingType.CLEAR, fill: "0F172A" },
                    children: [new Paragraph({ children: [new TextRun({ text: "True Origin / Physical Source", bold: true, color: "FFFFFF" })] })],
                  }),
                  new TableCell({
                    shading: { type: ShadingType.CLEAR, fill: "0F172A" },
                    children: [new Paragraph({ children: [new TextRun({ text: "Delivery Mechanism", bold: true, color: "FFFFFF" })] })],
                  }),
                ],
              }),
              // Row 1
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: "Battery Level % (e.g. 85%)", bold: true })] })],
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: "NO (Dynamic)", color: "DC2626", bold: true })] })],
                  }),
                  new TableCell({
                    children: [new Paragraph({ text: "Hardware Fuel Gauge IC (Coulomb Counter) → /sys/class/power_supply/battery/capacity" })],
                  }),
                  new TableCell({
                    children: [new Paragraph({ text: "OS Intent.ACTION_BATTERY_CHANGED (Sticky Broadcast)" })],
                  }),
                ],
              }),
              // Row 2
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: "Charging Status (Plugged/Unplugged)", bold: true })] })],
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: "NO (Dynamic)", color: "DC2626", bold: true })] })],
                  }),
                  new TableCell({
                    children: [new Paragraph({ text: "USB-C CC Controller Pin negotiation & PMIC charging circuit" })],
                  }),
                  new TableCell({
                    children: [new Paragraph({ text: "ACTION_POWER_CONNECTED / DISCONNECTED Broadcasts" })],
                  }),
                ],
              }),
              // Row 3
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: "Battery Temp (e.g. 37.0°C)", bold: true })] })],
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: "NO (Dynamic)", color: "DC2626", bold: true })] })],
                  }),
                  new TableCell({
                    children: [new Paragraph({ text: "NTC Thermal Resistor on battery circuit board" })],
                  }),
                  new TableCell({
                    children: [new Paragraph({ text: "BatteryManager.EXTRA_TEMPERATURE (tenths of °C)" })],
                  }),
                ],
              }),
              // Row 4
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: "Battery Voltage (e.g. 4100 mV)", bold: true })] })],
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: "NO (Dynamic)", color: "DC2626", bold: true })] })],
                  }),
                  new TableCell({
                    children: [new Paragraph({ text: "Analog-to-Digital Converter across anode/cathode" })],
                  }),
                  new TableCell({
                    children: [new Paragraph({ text: "BatteryManager.EXTRA_VOLTAGE (millivolts)" })],
                  }),
                ],
              }),
              // Row 5
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: "Device Notification Tone", bold: true })] })],
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: "System DB entry", color: "D97706", bold: true })] })],
                  }),
                  new TableCell({
                    children: [new Paragraph({ text: "Android Settings SQLite DB → /system/media/audio/notifications/" })],
                  }),
                  new TableCell({
                    children: [new Paragraph({ text: "RingtoneManager.getDefaultUri(TYPE_NOTIFICATION)" })],
                  }),
                ],
              }),
              // Row 6
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: "Your App Checkboxes (80%, Sound)", bold: true })] })],
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: "YES (Persistent File)", color: "16A34A", bold: true })] })],
                  }),
                  new TableCell({
                    children: [new Paragraph({ text: "Flash Memory XML: /data/data/com.chargealert.app/shared_prefs/" })],
                  }),
                  new TableCell({
                    children: [new Paragraph({ text: "Android SharedPreferences getBoolean() / putBoolean()" })],
                  }),
                ],
              }),
            ],
          }),

          new Paragraph({ text: "", spacing: { after: 300 } }),

          // Footer
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: "Generated by Charge Alert Engineering • Document format: Microsoft Word (.docx)\nCompatible with Microsoft Office Word, Google Docs, Apple Pages, and LibreOffice Writer",
                size: 18,
                color: "94A3B8",
                italics: true,
              }),
            ],
          }),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  const outPath1 = path.resolve(__dirname, 'public/How_Android_Gets_Device_Information.docx');
  const outPath2 = path.resolve(__dirname, 'public/download/How_Android_Gets_Device_Information.docx');
  const outPath3 = '/public/How_Android_Gets_Device_Information.docx';
  
  fs.writeFileSync(outPath1, buffer);
  try { fs.writeFileSync(outPath2, buffer); } catch(e){}
  try { fs.writeFileSync(outPath3, buffer); } catch(e){}

  console.log('Successfully generated Word file:', outPath1, 'Size:', buffer.length, 'bytes');
}

createWordDocument().catch(console.error);
