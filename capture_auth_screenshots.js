import { chromium } from './frontend/node_modules/playwright/index.mjs';
import path from 'path';

const artifactDir = 'C:/Users/ASUS/.gemini/antigravity/brain/aba8e72b-b166-4992-9396-7207a5d8fc35';

async function main() {
  console.log('Launching Chromium for Auth Text Animation Verification...');
  const browser = await chromium.launch({
    headless: true,
    args: ['--enable-webgl', '--use-gl=swiftshader'],
  });

  // 1. Desktop Login (1440x900)
  {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
    });
    console.log('Navigating to http://127.0.0.1:5173/login...');
    await page.goto('http://127.0.0.1:5173/login', { waitUntil: 'networkidle' });
    // Wait for text animations and 3D canvas rendering to settle
    await page.waitForTimeout(3000);
    const destAnim = path.join(artifactDir, 'login_desktop_text_anim.png');
    await page.screenshot({ path: destAnim, fullPage: false });
    console.log('Captured login_desktop_text_anim.png:', destAnim);

    const destV2 = path.join(artifactDir, 'login_desktop_3d_v2.png');
    await page.screenshot({ path: destV2, fullPage: false });
    await page.close();
  }

  // 2. Mobile Login (390x844)
  {
    const page = await browser.newPage({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
    });
    await page.goto('http://127.0.0.1:5173/login', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2500);
    const destAnim = path.join(artifactDir, 'login_mobile_text_anim.png');
    await page.screenshot({ path: destAnim, fullPage: true });
    console.log('Captured login_mobile_text_anim.png:', destAnim);

    const destV2 = path.join(artifactDir, 'login_mobile_3d_v2.png');
    await page.screenshot({ path: destV2, fullPage: true });
    await page.close();
  }

  // 3. Desktop Register (1440x900)
  {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
    });
    await page.goto('http://127.0.0.1:5173/register', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    const destAnim = path.join(artifactDir, 'register_desktop_text_anim.png');
    await page.screenshot({ path: destAnim, fullPage: false });
    console.log('Captured register_desktop_text_anim.png:', destAnim);

    const destV2 = path.join(artifactDir, 'register_desktop_3d_v2.png');
    await page.screenshot({ path: destV2, fullPage: false });
    await page.close();
  }

  // 4. Mobile Register (390x844)
  {
    const page = await browser.newPage({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
    });
    await page.goto('http://127.0.0.1:5173/register', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2500);
    const destAnim = path.join(artifactDir, 'register_mobile_text_anim.png');
    await page.screenshot({ path: destAnim, fullPage: true });
    console.log('Captured register_mobile_text_anim.png:', destAnim);
    await page.close();
  }

  await browser.close();
  console.log('All text animation screenshots captured successfully!');
}

main().catch((err) => {
  console.error('Screenshot error:', err);
  process.exit(1);
});
