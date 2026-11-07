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

  // Mock ALL API routes
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
        { id: 'sched-1', name: 'Lịch học chính khóa K15', semester: 'Fall 2026', isDefault: true },
      ]),
    });
  });

  await page.route('**/api/v1/tasks**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        content: [
          {
            id: 'task-1',
            title: 'Hoàn thiện tài liệu Sprint Review SWP391',
            status: 'PENDING',
            priority: 'HIGH',
            estimatedDurationMinutes: 120,
            deadline: '2026-11-10T17:00:00Z',
          },
          {
            id: 'task-2',
            title: 'Ôn tập trắc nghiệm PRN211 Lab 3 & 4',
            status: 'PENDING',
            priority: 'MEDIUM',
            estimatedDurationMinutes: 60,
            deadline: '2026-11-08T23:59:00Z',
          },
        ],
        totalElements: 2,
      }),
    });
  });

  await page.route('**/api/v1/events**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 'evt-1',
          title: 'PRN211 · Lập trình ứng dụng C# .NET',
          startsAt: '2026-11-06T07:30:00Z',
          endsAt: '2026-11-06T09:45:00Z',
          location: 'Alpha 204',
          category: 'ACADEMIC',
        },
        {
          id: 'evt-2',
          title: 'SWP391 · Đồ án phát triển phần mềm',
          startsAt: '2026-11-06T13:00:00Z',
          endsAt: '2026-11-06T15:15:00Z',
          location: 'Beta 302',
          category: 'PROJECT',
        },
      ]),
    });
  });

  await page.route('**/api/v1/notifications**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ totalElements: 2, content: [] }),
    });
  });

  await page.addInitScript(({ token, user }) => {
    localStorage.setItem('smartschedule_access_token', token);
    localStorage.setItem('smartschedule_refresh_token', token);
    localStorage.setItem('smartschedule_user', JSON.stringify(user));
  }, { token: validToken, user: mockUser });

  // 1. Visit dashboard
  await page.goto('http://localhost:5173/dashboard', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outDir, 'qa_fixed_mobile_01_dashboard.png') });
  console.log('Captured qa_fixed_mobile_01_dashboard.png');

  // 2. Visit calendar
  await page.goto('http://localhost:5173/calendar', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outDir, 'qa_fixed_mobile_02_calendar.png') });
  console.log('Captured qa_fixed_mobile_02_calendar.png');

  // 3. Visit tasks
  await page.goto('http://localhost:5173/tasks', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outDir, 'qa_fixed_mobile_03_tasks.png') });
  console.log('Captured qa_fixed_mobile_03_tasks.png');

  // 4. Visit AI assistant
  await page.goto('http://localhost:5173/ai', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outDir, 'qa_fixed_mobile_04_ai.png') });
  console.log('Captured qa_fixed_mobile_04_ai.png');

  // 5. Visit settings
  await page.goto('http://localhost:5173/settings', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outDir, 'qa_fixed_mobile_05_settings.png') });
  console.log('Captured qa_fixed_mobile_05_settings.png');

  await browser.close();
}

run().catch(console.error);
