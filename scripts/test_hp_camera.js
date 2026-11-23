const { chromium } = require('playwright');
const path = require('path');

async function testHPCamera() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--use-fake-ui-for-media-stream']
  });

  const page = await browser.newPage();
  const filePath = path.resolve(__dirname, '..', 'src', 'renderer', 'index.html');
  await page.goto('file:///' + filePath.replace(/\\/g, '/'));

  const result = await page.evaluate(async () => {
    try {
      const devs = await navigator.mediaDevices.enumerateDevices();
      const videoDevs = devs.filter(d => d.kind === 'videoinput');
      const hpDev = videoDevs.find(d => d.label.toLowerCase().includes('hp') || d.label.toLowerCase().includes('true vision') || d.label.toLowerCase().includes('integrated')) || videoDevs[0];

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: hpDev.deviceId }, width: 640, height: 480 },
        audio: false
      });
      const track = stream.getVideoTracks()[0];
      return {
        active: stream.active,
        label: track ? track.label : 'none',
        readyState: track ? track.readyState : 'none'
      };
    } catch (e) {
      return { error: e.name + ': ' + e.message };
    }
  });

  console.log('HP Camera Stream result:', result);
  await browser.close();
}

testHPCamera();
