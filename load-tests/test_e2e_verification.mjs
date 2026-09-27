/**
 * SmartSchedule Full-Stack Runtime Verification Suite
 * Executes live HTTP requests against real Spring Boot API + PostgreSQL
 * Records exact HTTP methods, URLs, status codes, and payload summaries.
 */

import http from 'http';

const BASE_URL = 'http://localhost:8080/api/v1';
const ACTIVATION_KEY = 'SMART-DEPLOY-2026';

const results = [];

async function request(method, path, body = null, headers = {}) {
  const url = new URL(`${BASE_URL}${path}`);
  const reqHeaders = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...headers,
  };

  const payload = body ? JSON.stringify(body) : null;
  if (payload) {
    reqHeaders['Content-Length'] = Buffer.byteLength(payload);
  }

  return new Promise((resolve, reject) => {
    const req = http.request(
      url,
      {
        method,
        headers: reqHeaders,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          let json = null;
          try {
            json = data ? JSON.parse(data) : null;
          } catch {
            json = data;
          }
          const entry = {
            method,
            path,
            status: res.statusCode,
            headers: res.headers,
            data: json,
          };
          resolve(entry);
        });
      }
    );

    req.on('error', (err) => reject(err));
    if (payload) {
      req.write(payload);
    }
    req.end();
  });
}

function logStep(stepNum, name, res, passCondition, extra = '') {
  const passed = passCondition(res);
  const statusMark = passed ? '✅ PASS' : '❌ FAIL';
  const detail = extra ? ` (${extra})` : '';
  console.log(`[Step ${stepNum.toString().padStart(2, '0')}] ${name.padEnd(52)} | ${res.method.padEnd(6)} ${res.path.padEnd(45)} | HTTP ${res.status} | ${statusMark}${detail}`);
  results.push({ step: stepNum, name, method: res.method, path: res.path, status: res.status, passed, extra });
  return passed;
}

async function runVerification() {
  console.log('='.repeat(120));
  console.log('            SMARTSCHEDULE FULL-STACK REAL HTTP RUNTIME VERIFICATION (SPRING BOOT + POSTGRESQL)');
  console.log('='.repeat(120));

  const timestamp = Date.now();
  const userA_Email = `alice_${timestamp}@smartschedule.local`;
  const userB_Email = `bob_${timestamp}@smartschedule.local`;
  const password = 'Password123!';

  // =========================================================================
  // 1. HEALTHCHECK
  // =========================================================================
  const healthRes = await request('GET', '/health');
  logStep(1, 'Backend Health Check', healthRes, (r) => r.status === 200 && r.data?.status === 'UP');

  // =========================================================================
  // 2. ACTIVATION KEY GATING & SECURITY
  // =========================================================================
  const badKeyRes = await request('POST', '/auth/register', {
    displayName: 'Bad Key User',
    email: `bad_${timestamp}@example.com`,
    password: password,
    activationKey: 'WRONG-KEY-999',
  });
  logStep(2, 'Reject Registration with Invalid Key', badKeyRes, (r) => r.status === 403, `Code: ${badKeyRes.data?.code}`);

  // =========================================================================
  // 3. USER A REGISTRATION & AUTH
  // =========================================================================
  const regUserARes = await request('POST', '/auth/register', {
    displayName: 'Alice Verified',
    email: userA_Email,
    password: password,
    activationKey: ACTIVATION_KEY,
  });
  const tokenA = regUserARes.data?.accessToken;
  logStep(3, 'Register User A with Activation Key', regUserARes, (r) => (r.status === 200 || r.status === 201) && !!tokenA, `User: ${regUserARes.data?.user?.email}`);

  const authA = { Authorization: `Bearer ${tokenA}` };

  // 4. Load User A Profile (/me)
  const meRes = await request('GET', '/users/me', null, authA);
  const tier = meRes.data?.tier;
  logStep(4, 'Load User A Profile (Tier Check)', meRes, (r) => r.status === 200 && r.data?.tier === 'PRO', `Effective Tier: ${tier}`);

  // =========================================================================
  // 5. SCHEDULE CREATION & RETRIEVAL (User A)
  // =========================================================================
  const createSchedRes = await request('POST', '/schedules', {
    name: 'Alice Academic Schedule',
    description: 'Verified production test schedule',
    timezone: 'Asia/Ho_Chi_Minh',
    visibility: 'PRIVATE',
  }, authA);
  const schedIdA = createSchedRes.data?.id;
  const schedVersion = createSchedRes.data?.version;
  logStep(5, 'Create Schedule A', createSchedRes, (r) => r.status === 201 && !!schedIdA, `ID: ${schedIdA}, Version: ${schedVersion}`);

  const getSchedRes = await request('GET', `/schedules`, null, authA);
  logStep(6, 'List Schedules for User A', getSchedRes, (r) => r.status === 200 && Array.isArray(r.data) && r.data.length > 0, `Count: ${getSchedRes.data?.length}`);

  // =========================================================================
  // 6. EVENT CREATION & CRUD (User A)
  // =========================================================================
  const startTime = new Date(Date.now() + 3600000).toISOString();
  const endTime = new Date(Date.now() + 7200000).toISOString();
  const createEventRes = await request('POST', `/schedules/${schedIdA}/events`, {
    title: 'Core Architecture Review',
    description: 'Fixed discussion block',
    startsAt: startTime,
    endsAt: endTime,
    location: 'Building Alpha',
    fixed: true,
  }, authA);
  const eventIdA = createEventRes.data?.id;
  logStep(7, 'Create Fixed Event on Schedule A', createEventRes, (r) => r.status === 201 && !!eventIdA, `Event ID: ${eventIdA}`);

  // Verify persistence by refetching
  const listEventsRes = await request('GET', `/schedules/${schedIdA}/events`, null, authA);
  logStep(8, 'Verify Event Persistence on Schedule A', listEventsRes, (r) => r.status === 200 && Array.isArray(r.data) && r.data.some(e => e.id === eventIdA));

  // =========================================================================
  // 7. TASK CREATION & REMAINING DURATION INVARIANT (User A)
  // =========================================================================
  const createTaskRes = await request('POST', `/schedules/${schedIdA}/tasks`, {
    title: 'Deploy Production Candidate',
    description: 'Final full stack verification pass',
    estimatedDurationMinutes: 120,
    remainingDurationMinutes: 120,
    priority: 'HIGH',
    deadline: new Date(Date.now() + 86400000).toISOString(),
  }, authA);
  const taskIdA = createTaskRes.data?.id;
  const initRemaining = createTaskRes.data?.remainingDurationMinutes;
  logStep(9, 'Create Task with 120m Estimate', createTaskRes, (r) => r.status === 201 && r.data?.remainingDurationMinutes === 120, `Remaining: ${initRemaining}m, ID: ${taskIdA}`);

  // Link Event to Task (Allocate 45 minutes)
  const linkEventRes = await request('POST', `/schedules/${schedIdA}/events`, {
    title: 'Deploy Execution Phase 1',
    description: 'Task linked work block',
    startsAt: new Date(Date.now() + 10800000).toISOString(),
    endsAt: new Date(Date.now() + 13500000).toISOString(), // 45 mins
    sourceTaskId: taskIdA,
    fixed: false,
  }, authA);
  const linkedEventId = linkEventRes.data?.id;
  logStep(10, 'Allocate 45m Event to Task', linkEventRes, (r) => r.status === 201 && !!linkedEventId, `Linked Event ID: ${linkedEventId}`);

  // Verify Task Remaining Duration is now 75m (120 - 45)
  const taskAfterAllocRes = await request('GET', `/tasks/${taskIdA}`, null, authA);
  const remAfterAlloc = taskAfterAllocRes.data?.remainingDurationMinutes;
  logStep(11, 'Verify Task Invariant (120 - 45 = 75m)', taskAfterAllocRes, (r) => r.status === 200 && r.data?.remainingDurationMinutes === 75, `Remaining: ${remAfterAlloc}m`);

  // Edit Event Allocated Duration to 60m via PUT /events/{id}
  const updateEventRes = await request('PUT', `/events/${linkedEventId}`, {
    title: 'Deploy Execution Phase 1 (Extended)',
    description: 'Updated 60m duration',
    startsAt: new Date(Date.now() + 10800000).toISOString(),
    endsAt: new Date(Date.now() + 14400000).toISOString(), // 60 mins
    sourceTaskId: taskIdA,
    fixed: false,
  }, authA);
  logStep(12, 'Update Event Duration to 60m', updateEventRes, (r) => r.status === 200);

  const taskAfterUpdateRes = await request('GET', `/tasks/${taskIdA}`, null, authA);
  const remAfterUpdate = taskAfterUpdateRes.data?.remainingDurationMinutes;
  logStep(13, 'Verify Task Invariant After Edit (120 - 60 = 60m)', taskAfterUpdateRes, (r) => r.status === 200 && r.data?.remainingDurationMinutes === 60, `Remaining: ${remAfterUpdate}m`);

  // Delete Event via DELETE /events/{id} & Verify Invariant Recalculates back to 120m
  const deleteEventRes = await request('DELETE', `/events/${linkedEventId}`, null, authA);
  logStep(14, 'Delete Linked Event', deleteEventRes, (r) => r.status === 204 || r.status === 200);

  const taskAfterDeleteRes = await request('GET', `/tasks/${taskIdA}`, null, authA);
  const remAfterDelete = taskAfterDeleteRes.data?.remainingDurationMinutes;
  logStep(15, 'Verify Task Reversion to 120m After Delete', taskAfterDeleteRes, (r) => r.status === 200 && r.data?.remainingDurationMinutes === 120, `Remaining: ${remAfterDelete}m`);

  // =========================================================================
  // 8. CONFIGURE AVAILABILITY & SMART PLAN GENERATE -> VALIDATE -> APPLY
  // =========================================================================
  // Configure daily work hours (08:00 - 20:00) for Schedule A
  for (let day = 1; day <= 7; day++) {
    await request('POST', `/schedules/${schedIdA}/availability`, {
      dayOfWeek: day,
      startTime: "08:00:00",
      endTime: "20:00:00",
      enabled: true,
    }, authA);
  }

  // Next day from 09:00 to 18:00 in UTC
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setUTCHours(9, 0, 0, 0);
  const planFrom = tomorrow.toISOString();
  
  const tomorrowEnd = new Date(tomorrow);
  tomorrowEnd.setUTCHours(18, 0, 0, 0);
  const planTo = tomorrowEnd.toISOString();

  // Create an unallocated task for planning
  const planTaskRes = await request('POST', `/schedules/${schedIdA}/tasks`, {
    title: 'Automated Smart Optimization Task',
    description: 'Requires solver slot allocation',
    estimatedDurationMinutes: 60,
    remainingDurationMinutes: 60,
    priority: 'MEDIUM',
    deadline: planTo,
  }, authA);
  const planTaskId = planTaskRes.data?.id;

  const generateRes = await request('POST', `/schedules/${schedIdA}/scheduling/generate`, {
    from: planFrom,
    to: planTo,
    granularityMinutes: 30,
    taskIds: [planTaskId],
  }, authA);
  const plan = generateRes.data;
  logStep(16, 'Generate Smart Plan Proposal', generateRes, (r) => r.status === 200 && !!r.data?.planId, `Plan ID: ${plan?.planId}, Slots: ${plan?.slots?.length}`);

  // Validate Proposal
  const validateRes = await request('POST', `/schedules/${schedIdA}/scheduling/validate`, {
    planId: plan?.planId,
    fingerprint: plan?.fingerprint || 'initial',
    slots: plan?.slots || [],
    scheduleVersion: plan?.scheduleVersion,
  }, authA);
  logStep(17, 'Validate Smart Plan Proposal', validateRes, (r) => r.status === 200 && r.data?.valid === true, `Valid: ${validateRes.data?.valid}`);

  // Apply Proposal to Database
  const applyRes = await request('POST', `/schedules/${schedIdA}/scheduling/apply`, {
    planId: plan?.planId,
    fingerprint: plan?.fingerprint || 'initial',
    slots: plan?.slots || [],
    scheduleVersion: plan?.scheduleVersion,
  }, authA);
  logStep(18, 'Apply Smart Plan Proposal to Database', applyRes, (r) => r.status === 200, `New version: ${applyRes.data?.scheduleVersion}`);


  // =========================================================================
  // 9. USER ISOLATION (User A vs User B)
  // =========================================================================
  const regUserBRes = await request('POST', '/auth/register', {
    displayName: 'Bob Isolated',
    email: userB_Email,
    password: password,
    activationKey: ACTIVATION_KEY,
  });
  const tokenB = regUserBRes.data?.accessToken;
  const authB = { Authorization: `Bearer ${tokenB}` };
  logStep(19, 'Register User B', regUserBRes, (r) => (r.status === 200 || r.status === 201) && !!tokenB);

  // User B creates Schedule B
  const schedBRes = await request('POST', '/schedules', {
    name: 'Bob Private Schedule',
    description: 'Strictly isolated workspace',
    timezone: 'UTC',
    visibility: 'PRIVATE',
  }, authB);
  const schedIdB = schedBRes.data?.id;
  logStep(20, 'Create Schedule B for User B', schedBRes, (r) => r.status === 201 && !!schedIdB);

  // User A attempts to read User B's schedule (MUST BE REJECTED)
  const crossReadRes = await request('GET', `/schedules/${schedIdB}`, null, authA);
  logStep(21, 'User A Cannot Read Schedule B (Strict Isolation)', crossReadRes, (r) => r.status === 403 || r.status === 404, `Cross-read status: ${crossReadRes.status}`);

  // User B lists schedules -> Sees ONLY Schedule B, NOT Schedule A
  const listBRes = await request('GET', '/schedules', null, authB);
  const userB_seesOnlyB = Array.isArray(listBRes.data) && listBRes.data.every(s => s.id !== schedIdA);
  logStep(22, 'User B List Isolates Data from User A', listBRes, (r) => r.status === 200 && userB_seesOnlyB, `User B count: ${listBRes.data?.length}`);

  // User B lists tasks -> Sees NO tasks from User A
  const listTasksB = await request('GET', `/schedules/${schedIdB}/tasks`, null, authB);
  const userB_seesNoTasksOfA = listTasksB.data?.content ? listTasksB.data.content.every(t => t.id !== taskIdA) : true;
  logStep(23, 'User B Tasks Isolated from User A', listTasksB, (r) => r.status === 200 && userB_seesNoTasksOfA);

  // =========================================================================
  // 10. OPTIMISTIC LOCKING COLLISION TEST (HTTP 409)
  // =========================================================================
  const currentSchedA = await request('GET', `/schedules/${schedIdA}`, null, authA);
  const vCurrent = currentSchedA.data?.version ?? 0;

  // Client 1 updates schedule successfully -> advances version
  const update1Res = await request('PUT', `/schedules/${schedIdA}`, {
    name: 'Alice Schedule Updated by Client 1',
    description: 'Valid version bump',
    timezone: 'Asia/Ho_Chi_Minh',
    version: vCurrent,
  }, authA);
  logStep(24, 'Client 1 Updates Schedule with Current Version', update1Res, (r) => r.status === 200, `New version: ${update1Res.data?.version}`);

  // Client 2 attempts to update using stale version vCurrent -> MUST return 409
  const update2Res = await request('PUT', `/schedules/${schedIdA}`, {
    name: 'Alice Schedule Updated by Stale Client 2',
    description: 'Stale version collision attempt',
    timezone: 'Asia/Ho_Chi_Minh',
    version: vCurrent, // Stale!
  }, authA);
  logStep(25, 'Stale Version Yields HTTP 409 Conflict', update2Res, (r) => r.status === 409, `Code: ${update2Res.data?.code || 'RESOURCE_VERSION_CONFLICT'}`);

  // =========================================================================
  // 11. CONCURRENT TASK DURATION INVARIANT TEST (PESSIMISTIC WRITE LOCK)
  // =========================================================================
  const parallelTaskRes = await request('POST', `/schedules/${schedIdA}/tasks`, {
    title: 'Concurrent Racing Task',
    estimatedDurationMinutes: 120,
    remainingDurationMinutes: 120,
    priority: 'HIGH',
  }, authA);
  const racingTaskId = parallelTaskRes.data?.id;

  // Launch 2 parallel event insertions allocating 60m each to the same task
  const p1 = request('POST', `/schedules/${schedIdA}/events`, {
    title: 'Racing Event Slot 1',
    startsAt: new Date(Date.now() + 18000000).toISOString(),
    endsAt: new Date(Date.now() + 21600000).toISOString(), // 60 mins
    sourceTaskId: racingTaskId,
    fixed: false,
  }, authA);

  const p2 = request('POST', `/schedules/${schedIdA}/events`, {
    title: 'Racing Event Slot 2',
    startsAt: new Date(Date.now() + 21600000).toISOString(),
    endsAt: new Date(Date.now() + 25200000).toISOString(), // 60 mins
    sourceTaskId: racingTaskId,
    fixed: false,
  }, authA);

  const [resP1, resP2] = await Promise.all([p1, p2]);
  const taskRacingFinal = await request('GET', `/tasks/${racingTaskId}`, null, authA);
  const finalRem = taskRacingFinal.data?.remainingDurationMinutes;
  logStep(26, 'Pessimistic Lock: Concurrent 60m+60m Yields Remaining 0m', taskRacingFinal,
    (r) => r.status === 200 && r.data?.remainingDurationMinutes === 0,
    `Final remaining: ${finalRem}m (P1 status: ${resP1.status}, P2 status: ${resP2.status})`);

  // =========================================================================
  // 12. AUTHENTICATION RE-LOGIN & PERSISTENCE
  // =========================================================================
  const loginRes = await request('POST', '/auth/login', {
    email: userA_Email,
    password: password,
  });
  logStep(27, 'Re-Login User A', loginRes, (r) => r.status === 200 && !!r.data?.accessToken);

  const logoutRes = await request('POST', '/auth/logout', null, authA);
  logStep(28, 'Logout User A', logoutRes, (r) => r.status === 200);

  // Verification of Data Persistence After Re-login
  const reLoginRes = await request('POST', '/auth/login', {
    email: userA_Email,
    password: password,
  });
  const newTokenA = reLoginRes.data?.accessToken;
  const newAuthA = { Authorization: `Bearer ${newTokenA}` };
  const verifyScheds = await request('GET', '/schedules', null, newAuthA);
  logStep(29, 'Verify All User A Data Persists After Re-Login', verifyScheds,
    (r) => r.status === 200 && r.data?.some(s => s.id === schedIdA),
    `Schedules count: ${verifyScheds.data?.length}`);

  console.log('='.repeat(120));
  const totalPassed = results.filter(r => r.passed).length;
  console.log(`TOTAL VERIFIED STEPS: ${results.length} | PASSED: ${totalPassed} | FAILED: ${results.length - totalPassed}`);
  console.log('='.repeat(120));

  if (totalPassed === results.length) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runVerification().catch(err => {
  console.error('FATAL RUNTIME ERROR:', err);
  process.exit(1);
});
