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

  const mockTasks = [
    {
      id: 'task-1',
      title: 'Lab 4 PRN211 - .NET Web API Architecture',
      estimatedDurationMinutes: 120,
      remainingDurationMinutes: 120,
      priority: 'HIGH',
      deadline: new Date(Date.now() + 86400000 * 2).toISOString(),
      status: 'TODO',
      minimumSessionMinutes: 30,
      maximumSessionMinutes: 120,
    },
    {
      id: 'task-2',
      title: 'Ôn tập trắc nghiệm Machine Learning AI',
      estimatedDurationMinutes: 90,
      remainingDurationMinutes: 90,
      priority: 'MEDIUM',
      deadline: new Date(Date.now() + 86400000 * 4).toISOString(),
      status: 'TODO',
      minimumSessionMinutes: 30,
      maximumSessionMinutes: 120,
    },
  ];

  await page.route('**/schedules/*/tasks**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        content: mockTasks,
        totalElements: mockTasks.length,
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

  await page.route('**/api/v1/categories**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 'cat-1', name: 'Môn chính khóa', color: '#ea580c' },
        { id: 'cat-2', name: 'Đồ án & Lab', color: '#4f46e5' },
      ]),
    });
  });

  const mockPlan = {
    planId: 'plan-123',
    fingerprint: 'fp-123',
    scheduleVersion: 1,
    algorithmVersion: 'OR-Tools CP-SAT v2.4',
    summary: {
      plannedMinutes: 210,
      remainingMinutes: 0,
      hardConflicts: 0,
      deadlineRisks: 0,
    },
    slots: [
      {
        taskId: 'task-1',
        title: 'Lab 4 PRN211 - .NET Web API Architecture',
        startsAt: new Date(Date.now() + 86400000).toISOString().slice(0, 11) + '14:00:00Z',
        endsAt: new Date(Date.now() + 86400000).toISOString().slice(0, 11) + '16:00:00Z',
        reasons: ['BEFORE_DEADLINE', 'NO_HARD_CONFLICT', 'BALANCED_DAILY_LOAD'],
      },
      {
        taskId: 'task-2',
        title: 'Ôn tập trắc nghiệm Machine Learning AI',
        startsAt: new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 11) + '09:00:00Z',
        endsAt: new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 11) + '10:30:00Z',
        reasons: ['PRIORITY_PRESERVED', 'NO_HARD_CONFLICT'],
      },
    ],
  };

  await page.route('**/scheduling/optimize-pro**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockPlan),
    });
  });

  await page.route('**/scheduling/generate**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockPlan),
    });
  });

  await page.route('**/scheduling/preferences**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        maxDailyMinutes: 360,
        minBreakMinutes: 30,
        preferredStart: '17:00',
        preferredEnd: '22:00',
        maximumSessionMinutes: 120,
        minimumSessionMinutes: 30,
      }),
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

  await page.goto('http://localhost:5173/scheduling', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  const screenshotPath = path.join(outDir, 'current_desktop_scheduling_populated.png');
  await page.screenshot({ path: screenshotPath, fullPage: false });
  console.log('Saved populated scheduling screenshot to:', screenshotPath);

  // Click "+ Thêm tác vụ" to test the modal popup with blurred backdrop
  const addTaskBtn = page.locator('button:has-text("Thêm tác vụ")');
  if (await addTaskBtn.count() > 0) {
    await addTaskBtn.first().click();
    await page.waitForTimeout(400);
    const modalPath = path.join(outDir, 'current_desktop_scheduling_modal.png');
    await page.screenshot({ path: modalPath, fullPage: false });
    console.log('Saved add task modal screenshot to:', modalPath);

    // Close the modal by clicking outside / close button
    const closeBtn = page.locator('.composer-header button');
    if (await closeBtn.count() > 0) {
      await closeBtn.click();
      await page.waitForTimeout(300);
    }
  }

  // Click the CP-SAT solver button
  const solverBtn = page.locator('.studio-btn-cpsat');
  if (await solverBtn.count() > 0) {
    await solverBtn.click();
    await page.waitForTimeout(2500);
    const generatedPath = path.join(outDir, 'current_desktop_scheduling_generated.png');
    await page.screenshot({ path: generatedPath, fullPage: false });
    console.log('Saved generated plan screenshot to:', generatedPath);
  }

  await browser.close();
}

run().catch(console.error);
