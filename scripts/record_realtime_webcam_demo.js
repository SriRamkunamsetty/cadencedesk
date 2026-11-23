const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

async function recordRealtimeWebcamDemo() {
  const recordingsDir = path.resolve(__dirname, '..', 'recordings');
  if (!fs.existsSync(recordingsDir)) {
    fs.mkdirSync(recordingsDir, { recursive: true });
  }

  // Clear older webm files in recordings
  const existingFiles = fs.readdirSync(recordingsDir);
  for (const f of existingFiles) {
    if (f.endsWith('.webm')) {
      try { fs.unlinkSync(path.join(recordingsDir, f)); } catch (_) {}
    }
  }

  console.log('====================================================');
  console.log('🎥 Launching Real-Time Webcam Demo Recording Session');
  console.log('Window will open on your screen with your HP camera!');
  console.log('====================================================');

  const browser = await chromium.launch({
    headless: false, // Visible window so user can see and interact!
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: [
      '--use-fake-ui-for-media-stream',
      '--window-size=1260,890',
      '--autoplay-policy=no-user-gesture-required'
    ]
  });

  const context = await browser.newContext({
    viewport: { width: 1240, height: 840 },
    recordVideo: {
      dir: recordingsDir,
      size: { width: 1240, height: 840 }
    }
  });

  const page = await context.newPage();
  const filePath = path.resolve(__dirname, '..', 'src', 'renderer', 'index.html');

  console.log('Navigating to CadenceDesk Workstation...');
  await page.goto('file:///' + filePath.replace(/\\/g, '/'));
  await page.waitForTimeout(1500);

  // Step 1: In-App Consent Shield
  console.log('Accepting Consent Shield...');
  await page.click('#chk-consent');
  await page.waitForTimeout(800);
  await page.click('#btn-grant-consent');
  await page.waitForTimeout(2000);

  // Step 2: Start Sensing
  console.log('Starting Sensing Session (Live Camera active)...');
  await page.click('#btn-start');

  // Let the user face and signals stabilize for 15s (Pulse warm-up)
  console.log('Calibrating & warming up signals (15s)...');
  await page.waitForTimeout(14000);

  // Respiration warm-up & waveforms flowing (15s)
  console.log('Displaying dual-trace waveforms & baseline progress (15s)...');
  await page.waitForTimeout(15000);

  // Simulate breath pause cue (breath halo)
  console.log('Demonstrating Breath-Hold Recovery Halo...');
  await page.evaluate(() => {
    const halo = document.getElementById('breath-halo');
    if (halo) halo.classList.remove('hidden');
    const apTile = document.getElementById('status-apnea');
    if (apTile) {
      apTile.textContent = 'Pause Detected';
      apTile.style.color = '#00f2fe';
    }
  });
  await page.waitForTimeout(6000);

  // Return halo to idle
  await page.evaluate(() => {
    const halo = document.getElementById('breath-halo');
    if (halo) halo.classList.add('hidden');
    const apTile = document.getElementById('status-apnea');
    if (apTile) {
      apTile.textContent = 'Steady';
      apTile.style.color = '';
    }
  });
  await page.waitForTimeout(3000);

  // Step 3: Stop Session and display Trust Receipt
  console.log('Stopping session & displaying Session Trust Receipt...');
  await page.click('#btn-stop');
  await page.waitForTimeout(5000);

  console.log('Closing browser to finalize video recording...');
  await page.close();
  await context.close();
  await browser.close();

  // Find recorded webm
  const newFiles = fs.readdirSync(recordingsDir).filter(f => f.endsWith('.webm'));
  if (newFiles.length === 0) {
    throw new Error('No recorded webm found in ' + recordingsDir);
  }

  const recordedWebm = path.join(recordingsDir, newFiles[0]);
  const outputMp4 = path.resolve(__dirname, '..', 'CadenceDesk_Demo_Video.mp4');

  console.log('Transcoding recording with ffmpeg to high-definition MP4...');
  const ffmpegCmd = `ffmpeg -y -i "${recordedWebm}" -c:v libx264 -preset slow -crf 20 -pix_fmt yuv420p "${outputMp4}"`;
  execSync(ffmpegCmd, { stdio: 'inherit' });

  const stats = fs.statSync(outputMp4);
  console.log(`Demo video successfully generated: ${outputMp4} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
}

recordRealtimeWebcamDemo().catch(err => {
  console.error('Recording error:', err);
  process.exit(1);
});
