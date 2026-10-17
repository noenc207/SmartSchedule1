import { chromium } from './frontend/node_modules/playwright/index.mjs';
import path from 'path';

const artifactDir = 'C:/Users/ASUS/.gemini/antigravity/brain/aba8e72b-b166-4992-9396-7207a5d8fc35';

async function main() {
  console.log('Launching Chromium for Smart Loading screenshots...');
  const browser = await chromium.launch({
    headless: true,
    args: ['--enable-webgl', '--use-gl=swiftshader'],
  });

  // 1. Normal Login (with connection indicator)
  {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
    });
    console.log('Navigating to http://127.0.0.1:5173/login...');
    await page.goto('http://127.0.0.1:5173/login', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2500);
    const dest = path.join(artifactDir, 'smart_login_default.png');
    await page.screenshot({ path: dest, fullPage: false });
    console.log('Captured smart_login_default.png:', dest);
    await page.close();
  }

  // 2. Login Submitting State (Phase 1/2 with elapsed counter and sweep line)
  {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
    });
    await page.goto('http://127.0.0.1:5173/login', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    // Type valid credentials
    await page.fill('input[type="email"]', 'teacher@fpt.edu.vn');
    await page.fill('input[type="password"]', 'CorrectPass123!');

    // Delay network requests so submitting state stays visible
    await page.route('**/api/v1/auth/login', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 6000));
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'SUCCESS',
          accessToken: 'mock-access-token',
          user: { id: 'u1', email: 'teacher@fpt.edu.vn', role: 'LECTURER' },
        }),
      });
    });

    // Click submit
    await page.click('button.login-submit-btn');
    await page.waitForTimeout(2000); // 2s into submission (Phase 1)
    const dest = path.join(artifactDir, 'smart_login_submitting_phase1.png');
    await page.screenshot({ path: dest, fullPage: false });
    console.log('Captured smart_login_submitting_phase1.png:', dest);
    await page.close();
  }

  // 3. Login Submitting State (Phase 3 Cold Start > 8s)
  {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
    });
    await page.goto('http://127.0.0.1:5173/login', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    await page.fill('input[type="email"]', 'lecturer.coldstart@fpt.edu.vn');
    await page.fill('input[type="password"]', 'CorrectPass123!');

    // Delay response past 10 seconds to trigger Cold Start warning
    await page.route('**/api/v1/auth/login', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 15000));
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'SUCCESS' }),
      });
    });

    await page.click('button.login-submit-btn');
    console.log('Waiting 9 seconds for cold start trigger...');
    await page.waitForTimeout(9500); // 9.5s into submission (Phase 3)
    const dest = path.join(artifactDir, 'smart_login_submitting_coldstart.png');
    await page.screenshot({ path: dest, fullPage: false });
    console.log('Captured smart_login_submitting_coldstart.png:', dest);
    await page.close();
  }

  // 4. OAuth Callback Screen with orbital motion and status telemetry
  {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
    });
    // Navigate to Google OAuth callback route with fake id_token
    await page.goto('http://127.0.0.1:5173/auth/google/callback#id_token=mock_jwt_token_for_preview', {
      waitUntil: 'load',
    });
    await page.waitForTimeout(1200);
    const dest = path.join(artifactDir, 'smart_oauth_callback.png');
    await page.screenshot({ path: dest, fullPage: false });
    console.log('Captured smart_oauth_callback.png:', dest);
    await page.close();
  }

  // 5. Mobile Login with smart submit card (390x844)
  {
    const page = await browser.newPage({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
    });
    await page.goto('http://127.0.0.1:5173/login', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await page.fill('input[type="email"]', 'student.mobile@fpt.edu.vn');
    await page.fill('input[type="password"]', 'Password123!');

    await page.route('**/api/v1/auth/login', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 8000));
      route.fulfill({ status: 200, body: '{}' });
    });

    await page.click('button.login-submit-btn');
    await page.waitForTimeout(2000);
    const dest = path.join(artifactDir, 'smart_login_mobile_submitting.png');
    await page.screenshot({ path: dest, fullPage: true });
    console.log('Captured smart_login_mobile_submitting.png:', dest);
    await page.close();
  }

  await browser.close();
  console.log('All Smart Loading screenshots captured successfully!');
}

main().catch((err) => {
  console.error('Screenshot error:', err);
  process.exit(1);
});
