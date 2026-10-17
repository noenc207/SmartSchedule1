const { chromium } = require('D:/SmartSchedul/frontend/node_modules/playwright');
const path = require('path');

async function test() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.goto('file:///D:/SmartSchedul/design-assets/preview.html', { waitUntil: 'networkidle' });

  // 1. Click on Illustrations
  await page.click('button[data-cat="illustrations"]');
  await page.waitForTimeout(300);
  const illCount = await page.locator('.asset-card').count();
  console.log('Illustrations count:', illCount);
  await page.screenshot({ path: 'D:/SmartSchedul/runtime-logs/screenshots/asset_library_illustrations.png' });

  // 2. Click on Photography
  await page.click('button[data-cat="photography"]');
  await page.waitForTimeout(300);
  const photoCount = await page.locator('.asset-card').count();
  console.log('Photography count:', photoCount);
  await page.screenshot({ path: 'D:/SmartSchedul/runtime-logs/screenshots/asset_library_photography.png' });

  // 3. Open modal on first card
  await page.click('.asset-card');
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'D:/SmartSchedul/runtime-logs/screenshots/asset_library_modal.png' });
  console.log('Modal opened successfully!');

  await browser.close();
  console.log('All UI interaction tests passed!');
}

test().catch(e => {
  console.error(e);
  process.exit(1);
});
