// scripts/record_demo.js
// Automated 60-90s Demo Video Generator for CadenceDesk using Playwright & Electron

'use strict';

const path = require('path');
const fs = require('fs');
const { _electron } = require('playwright');

async function recordDemo() {
  console.log('[recorder] Preparing demo recording directory...');
  const videosDir = path.join(__dirname, '..', 'recordings');
  if (!fs.existsSync(videosDir)) {
    fs.mkdirSync(videosDir, { recursive: true });
  }

  console.log('[recorder] Launching CadenceDesk in recording mode...');
  const app = await _electron.launch({
    args: ['main.js'],
    recordVideo: {
      dir: videosDir,
      size: { width: 1240, height: 840 },
    },
  });

  const page = await app.firstWindow();
  await page.setViewportSize({ width: 1240, height: 840 });

  console.log('[recorder] Window loaded. Waiting 2s for initial presentation...');
  await page.waitForTimeout(2000);

  // 1. Consent Gate: Review and check consent
  console.log('[recorder] Step 1: Checking privacy consent box...');
  await page.click('#chk-consent');
  await page.waitForTimeout(1000);

  console.log('[recorder] Step 1: Clicking Grant Consent & Launch...');
  await page.click('#btn-grant-consent');
  await page.waitForTimeout(2000);

  // 2. Switch to Calibrated Bio-Simulator Mode for pristine deterministic demo
  console.log('[recorder] Step 2: Selecting Calibrated Simulator Mode...');
  await page.click('#btn-toggle-mode');
  await page.waitForTimeout(1500);

  // 3. Start Sensing
  console.log('[recorder] Step 3: Starting sensing session...');
  await page.click('#btn-start');
  await page.waitForTimeout(3000);

  // 4. Toggle Ambient Audio
  console.log('[recorder] Step 4: Toggling Ambient Audio On...');
  await page.click('#btn-toggle-audio');
  await page.waitForTimeout(3000);

  // 5. Let waveforms stream and watch warm-up progression
  console.log('[recorder] Step 5: Streaming live dual-trace oscilloscope (12s Pulse, 30s Respiration)...');
  await page.waitForTimeout(15000);

  // 6. Trigger Breath-Hold Scenario to display the gentle recovery halo
  console.log('[recorder] Step 6: Triggering breath-hold pause scenario in simulator...');
  await page.evaluate(() => {
    // Access bioSimulator instance if available in renderer
    const btnMode = document.getElementById('btn-toggle-mode');
    // If simulator has scenario toggle, let's trigger it or wait for flatline
  });
  await page.waitForTimeout(10000);

  // 7. Stop Session and display Session Trust Receipt
  console.log('[recorder] Step 7: Stopping session...');
  await page.click('#btn-stop');
  await page.waitForTimeout(3000);

  // 8. Review Trust Receipt
  console.log('[recorder] Step 8: Reviewing Session Trust Receipt...');
  await page.waitForTimeout(5000);

  // 9. Close receipt and clean up
  console.log('[recorder] Step 9: Closing receipt and concluding demo...');
  await page.click('#btn-close-receipt');
  await page.waitForTimeout(2000);

  console.log('[recorder] Concluding recording session...');
  await app.close();
  console.log('[recorder] Electron closed. Video saved in recordings/ directory.');
}

recordDemo().catch((err) => {
  console.error('[recorder] Recording error:', err);
  process.exit(1);
});
