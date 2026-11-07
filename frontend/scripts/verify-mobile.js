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
    viewport: { width: 390, height: 844 }, // iPhone 12/13/14
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1',
    isMobile: true,
    hasTouch: true,
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

  await page.route('**/api/v1/auth/**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockUser),
    });
  });

  await page.route('**/api/v1/schedules**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([{ id: 'sched-1', name: 'Lịch chính khóa', isDefault: true }]),
    });
  });

  await page.addInitScript(({ token, user }) => {
    localStorage.setItem('smartschedule_access_token', token);
    localStorage.setItem('smartschedule_user', JSON.stringify(user));
  }, { token: validToken, user: mockUser });

  await page.goto('http://localhost:5173/tasks', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outDir, 'fixed_mobile_03_tasks.png') });
  console.log('Captured fixed_mobile_03_tasks.png');

  await browser.close();
}

run().catch(console.error);
