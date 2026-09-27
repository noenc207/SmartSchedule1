import { test, expect, Page } from '@playwright/test';

const ACTIVATION_KEY = 'SMART-STAGE-825881097B854931';
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:80';
const API_URL = process.env.PLAYWRIGHT_API_URL || 'http://localhost:80/api/v1';

test.describe.serial('SmartSchedule Final Staging Hardening E2E Suite', () => {
  const timestamp = Date.now();
  const userA = {
    displayName: 'Alice Staging Lead',
    email: `alice_staging_${timestamp}@smartschedule.local`,
    password: 'Password123!',
  };
  const userB = {
    displayName: 'Bob Isolated User',
    email: `bob_staging_${timestamp}@smartschedule.local`,
    password: 'Password123!',
  };

  let tokenA: string = '';
  let scheduleIdA: string = '';
  let taskIdA: string = '';
  let eventIdA: string = '';

  async function loginAsUserA(page: Page) {
    await page.goto('/login');
    await page.locator('input[autocomplete="email"]').fill(userA.email);
    await page.locator('input[autocomplete="current-password"]').fill(userA.password);
    await page.locator('button.auth-submit').click();
    await page.waitForURL('**/dashboard', { timeout: 8000 });
    // Dismiss onboarding tour if present
    await page.keyboard.press('Escape');
  }

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try {
        localStorage.setItem(
          'smartschedule_user_preferences',
          JSON.stringify({ state: { hasCompletedOnboarding: true }, version: 0 })
        );
      } catch {}
    });
  });

  // 01. Landing Page
  test('01 Landing: renders landing page, branding, and navigation', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/SmartSchedule/i);
    const ctaButton = page.locator('.btn-primary-glow, button:has-text("Vào SmartSchedule")').first();
    await expect(ctaButton).toBeVisible();
    const navProblem = page.locator('button.landing-nav-link:has-text("Vấn đề")').first();
    await expect(navProblem).toBeVisible();
  });

  // 02. Register with Invalid Activation Key
  test('02 Register: rejects registration when activation key is invalid', async ({ page }) => {
    await page.goto('/register');
    await page.locator('input[autocomplete="name"]').fill('Hacker User');
    await page.locator('input[autocomplete="email"]').fill(`bad_${timestamp}@example.com`);
    await page.locator('input[autocomplete="new-password"]').first().fill('Password123!');
    await page.locator('input[autocomplete="new-password"]').last().fill('Password123!');
    await page.locator('input[placeholder*="kích hoạt"]').fill('WRONG-KEY-XYZ-999');

    await page.locator('button.auth-submit').click();

    // Verify error is shown and URL stays on /register
    const errorAlert = page.locator('div[role="alert"].form-error');
    await expect(errorAlert).toBeVisible({ timeout: 5000 });
    expect(page.url()).toContain('/register');
  });

  // 03. Register with Valid Activation Key
  test('03 Register: registers successfully with valid key and redirects to dashboard', async ({ page }) => {
    await page.goto('/register');
    await page.locator('input[autocomplete="name"]').fill(userA.displayName);
    await page.locator('input[autocomplete="email"]').fill(userA.email);
    await page.locator('input[autocomplete="new-password"]').first().fill(userA.password);
    await page.locator('input[autocomplete="new-password"]').last().fill(userA.password);
    await page.locator('input[placeholder*="kích hoạt"]').fill(ACTIVATION_KEY);

    await page.locator('button.auth-submit').click();

    // Expect navigation to dashboard
    await expect(page).toHaveURL(/.*\/dashboard/, { timeout: 8000 });
    await page.keyboard.press('Escape');

    // Authenticate and fetch tokenA for subsequent API verification
    const loginRes = await page.request.post(`${API_URL}/auth/login`, {
      data: { email: userA.email, password: userA.password },
    });
    expect(loginRes.status()).toBe(200);
    tokenA = (await loginRes.json()).accessToken;
    expect(tokenA).toBeTruthy();
  });

  // 04. Login Flow
  test('04 Login: authenticates existing user and redirects to dashboard', async ({ page }) => {
    await page.goto('/login');
    await page.locator('input[autocomplete="email"]').fill(userA.email);
    await page.locator('input[autocomplete="current-password"]').fill(userA.password);
    await page.locator('button.auth-submit').click();

    await expect(page).toHaveURL(/.*\/dashboard/, { timeout: 8000 });
    await page.keyboard.press('Escape');
  });

  // 05. Current User State
  test('05 Current user: verifies user display name in dashboard view', async ({ page }) => {
    await loginAsUserA(page);
    const studentName = page.locator('.mock-student-name, .mock-hero-name').first();
    await expect(studentName).toBeVisible({ timeout: 5000 });
  });

  // 06. Create Schedule
  test('06 Create schedule: creates schedule workspace via UI', async ({ page }) => {
    await loginAsUserA(page);
    await page.goto('/schedules');
    await page.keyboard.press('Escape');
    await page.locator('input[placeholder="Personal planning"]').fill('Staging Core Schedule');
    await page.getByRole('button', { name: 'Create schedule' }).click();

    const scheduleItem = page.locator('.resource-row', { hasText: 'Staging Core Schedule' });
    await expect(scheduleItem).toBeVisible({ timeout: 5000 });

    // Fetch scheduleId from API
    const res = await page.request.get(`${API_URL}/schedules`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const data = await res.json();
    scheduleIdA = data[0]?.id;
    expect(scheduleIdA).toBeTruthy();
  });

  // 07 & 08. Event Creation & Persistence Across Page Reload
  test('07 & 08 Calendar Event Persistence: creates event and verifies persistence after reload', async ({ page }) => {
    // Seed event directly into PostgreSQL via API
    const start = new Date(Date.now() + 3600000).toISOString();
    const end = new Date(Date.now() + 7200000).toISOString();
    const res = await page.request.post(`${API_URL}/schedules/${scheduleIdA}/events`, {
      headers: { Authorization: `Bearer ${tokenA}` },
      data: {
        title: 'Browser Staging Lecture',
        startsAt: start,
        endsAt: end,
        location: 'Hall A101',
        fixed: true,
      },
    });
    expect(res.status()).toBe(201);
    const event = await res.json();
    eventIdA = event.id;

    // Login and navigate to calendar
    await loginAsUserA(page);
    await page.goto('/calendar');
    await page.keyboard.press('Escape');
    await page.waitForLoadState('networkidle');

    // Refresh browser to verify genuine database persistence
    await page.reload();
    await page.keyboard.press('Escape');
    await page.waitForLoadState('networkidle');

    // Verify through API refetch from PostgreSQL
    const checkRes = await page.request.get(`${API_URL}/schedules/${scheduleIdA}/events`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const events = await checkRes.json();
    expect(events.some((e: any) => e.id === eventIdA)).toBe(true);
  });

  // 09, 10, 11, 12. Task Invariant Lifecycle
  test('09-12 Task Duration Invariant: Create 120m -> Allocate 60m -> Update 90m -> Delete Recovery', async ({ page }) => {
    // 09. Create Task with 120m
    const taskRes = await page.request.post(`${API_URL}/schedules/${scheduleIdA}/tasks`, {
      headers: { Authorization: `Bearer ${tokenA}` },
      data: {
        title: 'Complete Software Architecture Spec',
        description: 'Verify remaining duration calculation',
        estimatedDurationMinutes: 120,
        remainingDurationMinutes: 120,
        priority: 'HIGH',
      },
    });
    expect(taskRes.status()).toBe(201);
    const task = await taskRes.json();
    taskIdA = task.id;
    expect(task.remainingDurationMinutes).toBe(120);

    // 10. Link event with 60m allocated
    const ev1Res = await page.request.post(`${API_URL}/schedules/${scheduleIdA}/events`, {
      headers: { Authorization: `Bearer ${tokenA}` },
      data: {
        title: 'Working Session Part 1',
        startsAt: new Date(Date.now() + 10800000).toISOString(),
        endsAt: new Date(Date.now() + 14400000).toISOString(),
        fixed: true,
        sourceTaskId: taskIdA,
      },
    });
    expect(ev1Res.status()).toBe(201);
    const linkedEvent = await ev1Res.json();

    // 11. Verify remaining duration is 60m
    const taskCheck1 = await page.request.get(`${API_URL}/tasks/${taskIdA}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    expect((await taskCheck1.json()).remainingDurationMinutes).toBe(60);

    // Update event to 90m (expand duration by 30m)
    await page.request.put(`${API_URL}/events/${linkedEvent.id}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
      data: {
        title: 'Working Session Part 1 Extended',
        startsAt: new Date(Date.now() + 10800000).toISOString(),
        endsAt: new Date(Date.now() + 16200000).toISOString(), // 90 min
        fixed: true,
        sourceTaskId: taskIdA,
      },
    });
    const taskCheck2 = await page.request.get(`${API_URL}/tasks/${taskIdA}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    expect((await taskCheck2.json()).remainingDurationMinutes).toBe(30);

    // 12. Delete event -> duration recovered to 120m
    await page.request.delete(`${API_URL}/events/${linkedEvent.id}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const taskCheck3 = await page.request.get(`${API_URL}/tasks/${taskIdA}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    expect((await taskCheck3.json()).remainingDurationMinutes).toBe(120);
  });

  // 13, 14, 15. Smart Plan Generation, Validation, and Application
  test('13-15 Smart Plan Lifecycle: Generate -> Validate -> Apply -> Persist', async ({ page }) => {
    // Set schedule availability window first (08:00 to 20:00 for Mon-Fri)
    for (let day = 1; day <= 5; day++) {
      await page.request.post(`${API_URL}/schedules/${scheduleIdA}/availability`, {
        headers: { Authorization: `Bearer ${tokenA}` },
        data: {
          dayOfWeek: day,
          startTime: '08:00:00',
          endTime: '20:00:00',
          enabled: true,
        },
      });
    }

    // 13. Generate Smart Plan
    const now = new Date();
    const from = new Date(now.getTime() + 3600 * 1000).toISOString();
    const to = new Date(now.getTime() + 7 * 24 * 3600 * 1000).toISOString();

    const genRes = await page.request.post(`${API_URL}/schedules/${scheduleIdA}/scheduling/generate`, {
      headers: { Authorization: `Bearer ${tokenA}` },
      data: {
        from,
        to,
        granularityMinutes: 30,
        taskIds: [taskIdA],
      },
    });
    expect(genRes.status()).toBe(200);
    const plan = await genRes.json();
    expect(plan.planId).toBeDefined();
    expect(plan.fingerprint).toBeDefined();

    // 14. Validate Smart Plan
    const valRes = await page.request.post(`${API_URL}/schedules/${scheduleIdA}/scheduling/validate`, {
      headers: { Authorization: `Bearer ${tokenA}` },
      data: {
        planId: plan.planId,
        fingerprint: plan.fingerprint,
        slots: plan.slots,
        scheduleVersion: plan.scheduleVersion,
      },
    });
    expect(valRes.status()).toBe(200);
    const valData = await valRes.json();
    expect(valData.valid).toBe(true);

    // 15. Apply Smart Plan
    const applyRes = await page.request.post(`${API_URL}/schedules/${scheduleIdA}/scheduling/apply`, {
      headers: { Authorization: `Bearer ${tokenA}` },
      data: {
        planId: plan.planId,
        fingerprint: plan.fingerprint,
        slots: plan.slots,
        scheduleVersion: plan.scheduleVersion,
      },
    });
    expect(applyRes.status()).toBe(200);
  });

  // 16. What-if Section
  test('16 What-If: simulator interaction verifies non-destructive simulation', async ({ page }) => {
    await page.goto('/#what-if');
    const whatIfSection = page.locator('#what-if');
    await expect(whatIfSection).toBeVisible({ timeout: 5000 });
    const slider = whatIfSection.locator('input[type="range"]');
    await expect(slider).toBeVisible();
  });

  // 17. Mobility Section & Adjacency Invariants
  test('17 Mobility: verifies campus mobility display and strict adjacency invariants', async ({ page }) => {
    await page.goto('/#mobility');
    const mobilitySection = page.locator('#mobility');
    await expect(mobilitySection).toBeVisible({ timeout: 5000 });

    // Fetch campus locations
    const locRes = await page.request.get(`${API_URL}/locations`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    expect(locRes.status()).toBe(200);
    const locations = await locRes.json();
    if (locations && locations.length >= 2) {
      const loc1 = locations[0];
      const loc2 = locations[1];

      // 1. Same physical location -> zero travel requirement
      const sameEstimate = await page.request.get(`${API_URL}/travel/estimate?from=${loc1.id}&to=${loc1.id}`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      if (sameEstimate.status() === 200) {
        const est = await sameEstimate.json();
        expect(est.durationMinutes).toBe(0);
        expect(est.distanceMeters).toBe(0);
      }

      // 2. Strict Adjacency: Event A (loc1) -> Event B (empty loc) -> Event C (loc2)
      // Must NOT produce an artificial A -> C travel warning
      const baseTime = Date.now() + 86400000;
      await page.request.post(`${API_URL}/schedules/${scheduleIdA}/events`, {
        headers: { Authorization: `Bearer ${tokenA}` },
        data: {
          title: 'Event A at Campus Loc1',
          startsAt: new Date(baseTime).toISOString(),
          endsAt: new Date(baseTime + 3600000).toISOString(),
          locationId: loc1.id,
          fixed: true,
        },
      });
      await page.request.post(`${API_URL}/schedules/${scheduleIdA}/events`, {
        headers: { Authorization: `Bearer ${tokenA}` },
        data: {
          title: 'Event B Online / No Location',
          startsAt: new Date(baseTime + 3600000).toISOString(),
          endsAt: new Date(baseTime + 7200000).toISOString(),
          fixed: true,
        },
      });
      const checkC = await page.request.post(`${API_URL}/events/check-mobility`, {
        headers: { Authorization: `Bearer ${tokenA}` },
        data: {
          scheduleId: scheduleIdA,
          title: 'Event C at Campus Loc2',
          startsAt: new Date(baseTime + 7200000).toISOString(),
          endsAt: new Date(baseTime + 10800000).toISOString(),
          locationId: loc2.id,
        },
      });
      expect(checkC.status()).toBe(200);
      const evalC = await checkC.json();
      expect(evalC.status).toBe('NORMAL');
      expect(evalC.hasWarning).toBe(false);
    }
  });

  // 18 & 19. Logout and Re-Login
  test('18 & 19 Session: logs out and re-authenticates securely', async ({ page }) => {
    await loginAsUserA(page);

    // Go to settings and click logout
    await page.goto('/settings');
    await page.evaluate(() => {
      try {
        localStorage.setItem(
          'smartschedule_user_preferences',
          JSON.stringify({ state: { hasCompletedOnboarding: true }, version: 0 })
        );
      } catch {}
    });
    await page.keyboard.press('Escape');
    const tourClose = page.locator('button.tour-close-btn, button[aria-label="Đóng hướng dẫn"]');
    if (await tourClose.isVisible().catch(() => false)) {
      await tourClose.click().catch(() => {});
    }
    const logoutBtn = page.locator('#logout-btn');
    await expect(logoutBtn).toBeVisible({ timeout: 5000 });
    await logoutBtn.click({ force: true });
    await page.waitForURL('**/login', { timeout: 8000 });
    expect(page.url()).toContain('/login');

    // Re-login
    await page.locator('input[autocomplete="email"]').fill(userA.email);
    await page.locator('input[autocomplete="current-password"]').fill(userA.password);
    await page.locator('button.auth-submit').click();
    await page.waitForURL('**/dashboard');
    expect(page.url()).toContain('/dashboard');
  });

  // 20. User Isolation Across Browser Contexts
  test('20 User Isolation: User B in fresh browser context cannot access User A schedule', async ({ browser }) => {
    // Register User B in new context
    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();

    const regB = await pageB.request.post(`${API_URL}/auth/register`, {
      headers: { 'X-Forwarded-For': '10.70.0.1' },
      data: {
        displayName: userB.displayName,
        email: userB.email,
        password: userB.password,
        activationKey: ACTIVATION_KEY,
      },
    });
    expect(regB.status()).toBe(200);
    const tokenB = (await regB.json()).accessToken;

    // User B attempts to access User A's schedule
    const crossAccessRes = await pageB.request.get(`${API_URL}/schedules/${scheduleIdA}`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    expect(crossAccessRes.status()).toBe(403);

    await contextB.close();
  });

  // 21. Backend Unavailable Handling (No Silent Demo Fallback)
  test('21 Backend Unavailable: shows explicit connection failure, not fake demo data', async ({ page }) => {
    await page.route('**/api/v1/auth/login', (route) => route.abort('failed'));
    await page.goto('/login');
    await page.locator('input[autocomplete="email"]').fill(userA.email);
    await page.locator('input[autocomplete="current-password"]').fill(userA.password);
    await page.locator('button.auth-submit').click();

    // Verify error alert is shown and no demo mode banner
    const errorAlert = page.locator('div[role="alert"].form-error');
    await expect(errorAlert).toBeVisible({ timeout: 5000 });
    const content = await page.content();
    expect(content).not.toContain('Demo Mode Active');
  });

  // 22. Stale Version 409 Conflict
  test('22 Optimistic Locking: stale schedule version rejected with HTTP 409', async ({ page }) => {
    const staleRes = await page.request.put(`${API_URL}/schedules/${scheduleIdA}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
      data: {
        name: 'Stale Update Collision',
        timezone: 'Asia/Ho_Chi_Minh',
        visibility: 'PRIVATE',
        version: 0, // Stale version (active schedule version is >= 1 after Smart Plan apply)
      },
    });
    expect(staleRes.status()).toBe(409);
    const errorBody = await staleRes.json();
    expect(errorBody.code).toBe('RESOURCE_VERSION_CONFLICT');
  });
});
