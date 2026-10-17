const { chromium } = require('D:/SmartSchedul/frontend/node_modules/playwright');
const fs = require('fs');
const path = require('path');
const GifEncoder = require('./gif_encoder.js');

const ROOT = path.join(__dirname, '..');
const GIF_DIR = path.join(ROOT, 'animations', 'gif');
const WEBP_DIR = path.join(ROOT, 'animations', 'webp');
const WEBM_DIR = path.join(ROOT, 'animations', 'webm');
const THUMB_DIR = path.join(ROOT, 'animations', 'thumbnails');

async function run() {
  console.log('Launching Playwright Chromium for animation rendering...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 320, height: 320 } });

  const htmlUrl = 'file:///' + path.join(__dirname, 'render_canvas.html').replace(/\\/g, '/');
  await page.goto(htmlUrl);

  const animList = await page.evaluate(() => window.getAnimationList());
  console.log(`Found ${animList.length} animation definitions:`, animList);

  const W = 320, H = 320;
  const numFrames = 24; // 24 frames per loop

  for (const animId of animList) {
    console.log(`Rendering [${animId}]...`);

    // 1. Render frames for GIF and Poster
    const gif = new GifEncoder(W, H);
    gif.setDelay(80); // 80ms per frame = 12.5 fps
    gif.setRepeat(0); // infinite loop

    let firstFramePng = null;
    let firstFrameWebp = null;

    for (let f = 0; f < numFrames; f++) {
      const t = f / numFrames;
      await page.evaluate(({ animId, t }) => {
        window.renderFrame(animId, t);
      }, { animId, t });

      // Frame 0 thumbnail & WebP
      if (f === 0) {
        firstFramePng = await page.evaluate(() => {
          return document.getElementById('canvas').toDataURL('image/png').split(',')[1];
        });
        firstFrameWebp = await page.evaluate(() => {
          return document.getElementById('canvas').toDataURL('image/webp', 0.9).split(',')[1];
        });
      }

      // Get RGBA buffer
      const rgbaBase64 = await page.evaluate(() => {
        const c = document.getElementById('canvas');
        const ctx = c.getContext('2d');
        const idata = ctx.getImageData(0, 0, c.width, c.height);
        // Convert to base64
        let binary = '';
        const bytes = new Uint8Array(idata.data.buffer);
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
      });

      const rgbaBuffer = Buffer.from(rgbaBase64, 'base64');
      gif.addFrame(rgbaBuffer);
    }

    // Save Static Thumbnail Poster
    const thumbPath = path.join(THUMB_DIR, `${animId}.png`);
    fs.writeFileSync(thumbPath, Buffer.from(firstFramePng, 'base64'));

    // Save Animated GIF
    const gifBuffer = gif.encode();
    const gifPath = path.join(GIF_DIR, `${animId}.gif`);
    fs.writeFileSync(gifPath, gifBuffer);

    // Save WebP (Poster / optimized WebP)
    const webpPath = path.join(WEBP_DIR, `${animId}.webp`);
    fs.writeFileSync(webpPath, Buffer.from(firstFrameWebp, 'base64'));

    // 2. Record WebM video loop via MediaRecorder
    try {
      const webmBase64 = await page.evaluate(async ({ animId, numFrames }) => {
        const canvas = document.getElementById('canvas');
        const stream = canvas.captureStream(30);
        const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9' });
        const chunks = [];
        recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };

        return new Promise((resolve) => {
          recorder.onstop = async () => {
            const blob = new Blob(chunks, { type: 'video/webm' });
            const reader = new FileReader();
            reader.onloadend = () => {
              const base64 = reader.result.split(',')[1];
              resolve(base64);
            };
            reader.readAsDataURL(blob);
          };

          recorder.start();
          let frame = 0;
          const totalRecorded = numFrames * 2; // 2 loops
          const interval = setInterval(() => {
            const t = (frame % numFrames) / numFrames;
            window.renderFrame(animId, t);
            frame++;
            if (frame >= totalRecorded) {
              clearInterval(interval);
              recorder.stop();
            }
          }, 33);
        });
      }, { animId, numFrames });

      if (webmBase64) {
        const webmPath = path.join(WEBM_DIR, `${animId}.webm`);
        fs.writeFileSync(webmPath, Buffer.from(webmBase64, 'base64'));
      }
    } catch (err) {
      console.warn(`Could not record WebM for ${animId}:`, err.message);
    }

    console.log(`  -> Saved: ${animId} (GIF: ${fs.statSync(gifPath).size} B, WebM: ${fs.existsSync(path.join(WEBM_DIR, `${animId}.webm`)) ? fs.statSync(path.join(WEBM_DIR, `${animId}.webm`)).size : 'N/A'} B)`);
  }

  await browser.close();
  console.log('All animations successfully rendered!');
}

run().catch(err => {
  console.error('Render error:', err);
  process.exit(1);
});
