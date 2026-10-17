const { chromium } = require('D:/SmartSchedul/frontend/node_modules/playwright');
const path = require('path');

async function test() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  const errors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', err => errors.push(err.message));

  await page.goto('file:///D:/SmartSchedul/design-assets/preview.html', { waitUntil: 'networkidle' });

  // 1. Click on Animations tab
  await page.click('button[data-cat="animations"]');
  await page.waitForTimeout(400);

  const animCount = await page.locator('.asset-card').count();
  console.log('Animations rendered in grid:', animCount);

  // Take screenshot of animation grid
  await page.screenshot({ path: 'D:/SmartSchedul/runtime-logs/screenshots/asset_library_animations_grid.png' });

  // 2. Click on the first animation card to open detail modal
  await page.locator('.asset-card').first().click();
  await page.waitForTimeout(400);

  // Take screenshot of modal
  await page.screenshot({ path: 'D:/SmartSchedul/runtime-logs/screenshots/asset_library_animation_modal.png' });
  console.log('Animation modal opened and captured!');

  await browser.close();

  if (errors.length > 0) {
    console.error('Console errors:', errors);
    process.exit(1);
  }
  console.log('All animation preview UI tests passed with 0 errors!');
}

test().catch(e => {
  console.error(e);
  process.exit(1);
});
