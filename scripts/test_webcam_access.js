const { chromium } = require('playwright');
const path = require('path');

async function testWebcam() {
  console.log('Testing laptop webcam detection in Chrome...');
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--use-fake-ui-for-media-stream']
  });

  const page = await browser.newPage();
  const filePath = path.resolve(__dirname, '..', 'src', 'renderer', 'index.html');
  await page.goto('file:///' + filePath.replace(/\\/g, '/'));

  // Evaluate mediaDevices
  const devices = await page.evaluate(async () => {
    try {
      const devs = await navigator.mediaDevices.enumerateDevices();
      return devs.map(d => ({ kind: d.kind, label: d.label, deviceId: d.deviceId ? 'present' : 'none' }));
    } catch (e) {
      return { error: e.message };
    }
  });

  console.log('Detected Devices:', JSON.stringify(devices, null, 2));
  await browser.close();
}

testWebcam().catch(err => console.error(err));
