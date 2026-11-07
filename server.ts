import express from 'express';
import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Dedicated endpoints for downloading the compiled APK and complete Source ZIP
  app.get(['/ChargeAlert.apk', '/download/ChargeAlert.apk'], (req, res) => {
    const apkPath = path.resolve(__dirname, 'public/ChargeAlert.apk');
    if (!fs.existsSync(apkPath)) {
      return res.status(404).send('APK file not found');
    }
    res.setHeader('Content-Type', 'application/vnd.android.package-archive');
    res.setHeader('Content-Disposition', 'attachment; filename="ChargeAlert.apk"');
    res.sendFile(apkPath);
  });

  app.get(['/ChargeAlert-source.zip', '/download/ChargeAlert-source.zip'], (req, res) => {
    const zipPath = path.resolve(__dirname, 'public/ChargeAlert-source.zip');
    if (!fs.existsSync(zipPath)) {
      return res.status(404).send('Source zip not found');
    }
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="ChargeAlert-source.zip"');
    res.sendFile(zipPath);
  });

  // Dedicated endpoint for downloading the Word file (.docx)
  app.get(['/How_Android_Gets_Device_Information.docx', '/download/How_Android_Gets_Device_Information.docx', '/Device_Data_Architecture.docx'], (req, res) => {
    const docxPath = path.resolve(__dirname, 'public/How_Android_Gets_Device_Information.docx');
    if (!fs.existsSync(docxPath)) {
      return res.status(404).send('Word document not found');
    }
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', 'attachment; filename="How_Android_Gets_Device_Information.docx"');
    res.sendFile(docxPath);
  });

  // API endpoint for APK metadata (checksum, size, build date)
  app.get('/api/apk-info', (req, res) => {
    const apkPath = path.resolve(__dirname, 'public/ChargeAlert.apk');
    if (!fs.existsSync(apkPath)) {
      return res.status(404).json({error: 'APK not found'});
    }
    const stat = fs.statSync(apkPath);
    res.json({
      name: 'Charge Alert',
      versionName: '1.5.0',
      versionCode: 6,
      packageName: 'com.chargealert.app',
      minSdk: 21,
      minAndroid: 'Android 5.0+ (Lollipop to Android 15)',
      targetSdk: 34,
      targetAndroid: 'Android 14 / 15 (Target SDK 34)',
      fileSize: stat.size,
      fileSizeFormatted: `${(stat.size / 1024).toFixed(1)} KB`,
      sha256: '3f80bcea33e0d5fb5adefa97d0740adc1c8a6a25a6cd11c02973d765342fde3c',
      signatures: ['v1 (JAR)', 'v2 (APK Signature)', 'v3 (APK Signature v3)'],
      buildDate: new Date(stat.mtime).toISOString(),
    });
  });

  // Mount Vite middleware in development
  if (process.env.NODE_ENV !== 'production') {
    const {createServer: createViteServer} = await import('vite');
    const vite = await createViteServer({
      server: {middlewareMode: true},
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist/index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Charge Alert server running on port ${PORT}`);
  });
}

startServer();
