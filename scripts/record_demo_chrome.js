// scripts/record_demo_chrome.js
// Copyright (C) 2026 CadenceDesk Project
// Automated High-Definition Video Recording Script using Playwright & Chrome

'use strict';

const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const { chromium } = require('playwright');

async function recordVideoWalkthrough() {
  const recordingsDir = path.join(__dirname, '..', 'recordings');
  if (!fs.existsSync(recordingsDir)) {
    fs.mkdirSync(recordingsDir, { recursive: true });
  }

  console.log('[recorder] Launching Google Chrome to record demo video...');
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1240, height: 840 },
    recordVideo: {
      dir: recordingsDir,
      size: { width: 1240, height: 840 },
    },
  });

  const page = await context.newPage();
  const htmlPath = path.join(__dirname, '..', 'src', 'renderer', 'index.html');
  const fileUrl = 'file:///' + htmlPath.replace(/\\/g, '/');

  console.log(`[recorder] Navigating to: ${fileUrl}`);
  await page.goto(fileUrl);
  await page.waitForLoadState('networkidle');

  // Scene 1: Consent Screen (3 seconds)
  console.log('[recorder] Scene 1: Presenting Privacy & Consent Gate...');
  await page.waitForTimeout(3000);

  console.log('[recorder] Checking consent box...');
  await page.click('#chk-consent');
  await page.waitForTimeout(1000);

  console.log('[recorder] Clicking Grant Consent & Launch...');
  await page.click('#btn-grant-consent');
  await page.waitForTimeout(2000);

  // Scene 2: Switch to Calibrated Bio-Simulator Mode
  console.log('[recorder] Scene 2: Selecting Calibrated Simulator Mode...');
  await page.click('#btn-toggle-mode');
  await page.waitForTimeout(1500);

  // Scene 3: Start Sensing & Warm-Up Progression
  console.log('[recorder] Scene 3: Starting sensing session...');
  await page.click('#btn-start');
  await page.waitForTimeout(2000);

  console.log('[recorder] Toggling Ambient Audio On...');
  await page.click('#btn-toggle-audio');
  await page.waitForTimeout(2000);

  console.log('[recorder] Streaming dual-trace oscilloscope & warm-up progression (15s)...');
  await page.waitForTimeout(15000);

  // Scene 4: Trigger Breath-Hold Pause Scenario
  console.log('[recorder] Scene 4: Simulating breath-hold cessation (8s)...');
  await page.evaluate(() => {
    // Manually trigger breath-hold state for demonstration visual
    const halo = document.getElementById('breath-halo');
    if (halo) halo.classList.remove('hidden');
    const tile = document.getElementById('tile-apnea');
    const st = document.getElementById('status-apnea');
    if (st) {
      st.textContent = 'Pause Detected';
      st.style.color = '#00f2fe';
    }
    const holds = document.getElementById('num-holds');
    if (holds) holds.textContent = '1';
  });
  await page.waitForTimeout(6000);

  // Clear breath-hold halo
  console.log('[recorder] Breathing resumes, recovery halo smoothly clears...');
  await page.evaluate(() => {
    const halo = document.getElementById('breath-halo');
    if (halo) halo.classList.add('hidden');
    const st = document.getElementById('status-apnea');
    if (st) {
      st.textContent = 'Steady';
      st.style.color = '';
    }
  });
  await page.waitForTimeout(4000);

  // Scene 5: Stop Sensing & Review Session Trust Receipt
  console.log('[recorder] Scene 5: Stopping session...');
  await page.click('#btn-stop');
  await page.waitForTimeout(2000);

  console.log('[recorder] Reviewing Session Trust Receipt Modal...');
  await page.waitForTimeout(5000);

  console.log('[recorder] Closing receipt...');
  await page.click('#btn-close-receipt');
  await page.waitForTimeout(2000);

  console.log('[recorder] Demo walkthrough complete. Closing browser...');
  await page.close();
  await context.close();
  await browser.close();

  // Find the generated webm video file
  const videoFiles = fs.readdirSync(recordingsDir).filter((f) => f.endsWith('.webm'));
  if (videoFiles.length > 0) {
    const latestVideo = path.join(recordingsDir, videoFiles[videoFiles.length - 1]);
    const mp4Output = path.join(__dirname, '..', 'CadenceDesk_Demo_Video.mp4');
    console.log(`[recorder] Raw video captured: ${latestVideo}`);
    console.log(`[recorder] Transcoding to MP4: ${mp4Output}...`);

    try {
      execSync(`ffmpeg -y -i "${latestVideo}" -c:v libx264 -preset fast -crf 20 -pix_fmt yuv420p "${mp4Output}"`, {
        stdio: 'inherit',
      });
      console.log(`[recorder] SUCCESS! Final demo video saved to: ${mp4Output}`);
    } catch (e) {
      console.warn('[recorder] Transcoding notice:', e.message);
    }
  }
}

recordVideoWalkthrough().catch((err) => {
  console.error('[recorder] Fatal error:', err);
  process.exit(1);
});
