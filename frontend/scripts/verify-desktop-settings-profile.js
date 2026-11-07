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
    viewport: { width: 1440, height: 960 },
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });

  const page = await context.newPage();
  const validToken = createMockJwt(86400);

  const mockUser = {
    id: 'user-123',
    email: 'nhi.vn@fpt.edu.vn',
    displayName: 'Vũ Ngọc Nhi',
    role: 'STUDENT',
    avatarUrl: '/avatar-nhi.png',
    timezone: 'Asia/Ho_Chi_Minh',
    locale: 'vi-VN',
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

  await page.route('**/api/v1/users/me', (route) => {
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
        {
          id: 'sched-1',
          name: 'Lịch học chính khóa K15',
          semester: 'Fall 2026',
          isDefault: true,
          timezone: 'Asia/Ho_Chi_Minh',
        },
      ]),
    });
  });

  await page.route('**/api/v1/categories**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 'cat-1', name: 'Học tập trên lớp', color: '#0047ba' },
        { id: 'cat-2', name: 'Đồ án & Dự án', color: '#7c3aed' },
        { id: 'cat-3', name: 'Thi & Ôn tập', color: '#f97316' },
      ]),
    });
  });

  await page.route('**/api/v1/schedules/*/availability**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 'avail-1', dayOfWeek: 1, startTime: '09:00:00', endTime: '17:00:00', enabled: true },
        { id: 'avail-2', dayOfWeek: 2, startTime: '09:00:00', endTime: '17:00:00', enabled: true },
        { id: 'avail-3', dayOfWeek: 3, startTime: '09:00:00', endTime: '17:00:00', enabled: true },
        { id: 'avail-4', dayOfWeek: 4, startTime: '09:00:00', endTime: '17:00:00', enabled: true },
        { id: 'avail-5', dayOfWeek: 5, startTime: '09:00:00', endTime: '17:00:00', enabled: true },
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

  await page.addInitScript(
    ({ token, user }) => {
      localStorage.setItem('smartschedule_access_token', token);
      localStorage.setItem('smartschedule_refresh_token', token);
      localStorage.setItem('smartschedule_user', JSON.stringify(user));
      localStorage.setItem('smartschedule-demo-mode', 'true');
      localStorage.setItem(
        'smartschedule_user_preferences_user-123',
        JSON.stringify({
          state: { hasCompletedOnboarding: true },
        })
      );
    },
    { token: validToken, user: mockUser }
  );

  console.log('Navigating to Settings Page...');
  await page.goto('http://localhost:5173/settings', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // 1. Capture Settings Page 2.0 (Tab 1: Profile & Avatar)
  const settingsPath = path.join(outDir, 'settings_page_2_rebuilt.png');
  await page.screenshot({ path: settingsPath, fullPage: true });
  console.log('Saved settings screenshot to:', settingsPath);

  // 2. Click User Profile Pill in Header to open Quick Customization Dropdown
  console.log('Opening User Quick Customization Dropdown...');
  const userPill = page.locator('#header-user-profile-btn');
  await userPill.click();
  await page.waitForTimeout(600);

  const dropdownPath = path.join(outDir, 'settings_quick_dropdown_open.png');
  await page.screenshot({ path: dropdownPath, fullPage: false });
  console.log('Saved user dropdown screenshot to:', dropdownPath);

  // 3. Open Avatar Studio Modal
  console.log('Opening Avatar Studio Modal...');
  const avatarTrigger = page.locator('#settings-avatar-trigger');
  await avatarTrigger.click();
  await page.waitForTimeout(600);

  const avatarModalPath = path.join(outDir, 'settings_avatar_modal_open.png');
  await page.screenshot({ path: avatarModalPath, fullPage: false });
  console.log('Saved avatar modal screenshot to:', avatarModalPath);

  // 4. Test Switching Tabs: Schedule & Categories
  const closeAvatarBtn = page.locator('.avatar-modal-card button[aria-label="Đóng cửa sổ"]');
  if (await closeAvatarBtn.isVisible()) {
    await closeAvatarBtn.click();
    await page.waitForTimeout(300);
  }
  const tabSchedule = page.locator('#tab-schedule-btn');
  await tabSchedule.click();
  await page.waitForTimeout(500);

  const scheduleTabPath = path.join(outDir, 'settings_schedule_categories_tab.png');
  await page.screenshot({ path: scheduleTabPath, fullPage: true });
  console.log('Saved schedule tab screenshot to:', scheduleTabPath);

  await browser.close();
  console.log('Verification completed successfully!');
}

run().catch((err) => {
  console.error('Error during execution:', err);
  process.exit(1);
});
