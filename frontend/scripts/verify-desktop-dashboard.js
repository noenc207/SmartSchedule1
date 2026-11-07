import { chromium } from '@playwright/test';
import path from 'node:path';

const outDir = 'C:/Users/ASUS/.gemini/antigravity/brain/aba8e72b-b166-4992-9396-7207a5d8fc35';

function createMockJwt(expSecondsFromNow = 86400) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
  const exp = Math.floor(Date.now() / 1000) + expSecondsFromNow;
  const payload = Buffer.from(JSON.stringify({ sub: 'user-123', exp })).toString('base64');
  return `${header}.${payload}.mock-signature`;
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1080 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });

  const page = await context.newPage();
  const validToken = createMockJwt(86400);

  const mockUser = {
    id: 'user-123',
    email: 'smartuser@fpt.edu.vn',
    displayName: 'SmartUser',
    role: 'STUDENT',
    avatarUrl: '/avatar-nhi.png',
    tier: 'PRO',
  };

  // Mock Auth routes
  await page.route('**/api/v1/auth/me', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockUser),
    });
  });

  await page.route('**/api/v1/auth/refresh', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        accessToken: validToken,
        refreshToken: validToken,
        user: mockUser,
      }),
    });
  });

  await page.route('**/api/v1/schedules**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 'sched-1', name: 'Lịch học chính khóa K15', semester: 'Fall 2026', isDefault: true, timezone: 'Asia/Ho_Chi_Minh' },
      ]),
    });
  });

  await page.route('**/api/v1/tasks**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        content: [],
        totalElements: 0,
      }),
    });
  });

  await page.route('**/api/v1/events**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });

  await page.route('**/api/v1/notifications**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ totalElements: 0, content: [] }),
    });
  });

  await page.addInitScript(({ token, user }) => {
    localStorage.setItem('smartschedule_access_token', token);
    localStorage.setItem('smartschedule_refresh_token', token);
    localStorage.setItem('smartschedule_user', JSON.stringify(user));
    localStorage.setItem('smartschedule_user_preferences_user-123', JSON.stringify({
      state: { hasCompletedOnboarding: true },
    }));
  }, { token: validToken, user: mockUser });

  await page.goto('http://localhost:5173/dashboard', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  const screenshotPath = path.join(outDir, 'current_desktop_dashboard.png');
  await page.screenshot({ path: screenshotPath, fullPage: false });
  console.log('Saved dashboard screenshot to:', screenshotPath);

  // Scrolled down view
  await page.evaluate(() => {
    const scrollers = [
      document.querySelector('.dashboard-page'),
      document.querySelector('.app-main'),
      document.querySelector('.app-layout'),
      document.documentElement,
      document.body,
    ];
    scrollers.forEach((el) => {
      if (el) el.scrollTop = 400;
    });
    window.scrollTo(0, 400);
  });
  await page.waitForTimeout(400);
  const scrolledPath = path.join(outDir, 'current_desktop_dashboard_scrolled.png');
  await page.screenshot({ path: scrolledPath, fullPage: false });
  console.log('Saved scrolled dashboard screenshot to:', scrolledPath);

  const fullScreenshotPath = path.join(outDir, 'current_desktop_dashboard_full.png');
  await page.screenshot({ path: fullScreenshotPath, fullPage: true });
  console.log('Saved full dashboard screenshot to:', fullScreenshotPath);

  await browser.close();
}

run().catch(console.error);
