import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// Custom metrics
const successfulLogins = new Counter('successful_logins');
const scheduleCreations = new Counter('schedules_created');
const eventCreations = new Counter('events_created');
const taskCreations = new Counter('tasks_created');
const failureRate = new Rate('custom_failure_rate');
const scheduleLatency = new Trend('schedule_api_latency');

export const options = {
  stages: [
    { duration: '30s', target: 20 }, // Ramp up to 20 concurrent users
    { duration: '1m', target: 20 },  // Steady state 20 users
    { duration: '30s', target: 50 }, // Ramp up to 50 users (peak baseline)
    { duration: '1m', target: 50 },  // Sustained 50 users
    { duration: '30s', target: 0 },  // Cool-down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'], // 95% of requests must complete within 500ms
    http_req_failed: ['rate<0.01'],                 // Less than 1% errors
    custom_failure_rate: ['rate<0.01'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080/api/v1';
const ACTIVATION_KEY = __ENV.ACTIVATION_KEY || 'SMART-STAGE-825881097B854931';

function uniqueEmail(vu, iter) {
  return `vu_${vu}_${iter}_${Date.now()}_${Math.floor(Math.random() * 100000)}@example.com`;
}

export default function () {
  const vu = __VU;
  const iter = __ITER;
  const email = uniqueEmail(vu, iter);
  const password = 'Password123!';

  let authToken = null;
  let scheduleId = null;
  let taskId = null;

  // 1. Health check
  group('01_Health_Check', () => {
    const res = http.get(`${BASE_URL}/health`);
    check(res, {
      'health status is 200': (r) => r.status === 200,
    });
  });

  // 2. User Registration & Auth
  group('02_Authentication', () => {
    const registerPayload = JSON.stringify({
      displayName: `VU User ${vu}`,
      email: email,
      password: password,
      activationKey: ACTIVATION_KEY,
    });

    const clientIp = `10.0.${vu}.${(iter % 200) + 1}`;
    const regHeaders = {
      'Content-Type': 'application/json',
      'X-Forwarded-For': clientIp,
    };
    const regRes = http.post(`${BASE_URL}/auth/register`, registerPayload, { headers: regHeaders });
    
    const regSuccess = check(regRes, {
      'register status is 200 or 201': (r) => r.status === 200 || r.status === 201,
      'register returns token': (r) => r.json('token') !== undefined || r.json('accessToken') !== undefined,
    });

    if (regSuccess) {
      authToken = regRes.json('accessToken') || regRes.json('token');
      successfulLogins.add(1);
    } else {
      failureRate.add(1);
      return; // Skip remaining steps if registration failed
    }
  });

  if (!authToken) {
    sleep(1);
    return;
  }

  const clientIp = `10.0.${vu}.${(iter % 200) + 1}`;
  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${authToken}`,
    'X-Forwarded-For': clientIp,
  };

  // 3. Schedule Management
  group('03_Schedule_Lifecycle', () => {
    const schedulePayload = JSON.stringify({
      name: `Schedule VU ${vu} Iter ${iter}`,
      description: 'Concurrent performance testing schedule',
      timezone: 'UTC',
      visibility: 'PRIVATE',
    });

    const startReq = Date.now();
    const createRes = http.post(`${BASE_URL}/schedules`, schedulePayload, { headers: authHeaders });
    scheduleLatency.add(Date.now() - startReq);

    const created = check(createRes, {
      'schedule created 201': (r) => r.status === 201,
      'schedule has valid id': (r) => r.json('id') !== undefined,
    });

    if (created) {
      scheduleId = createRes.json('id');
      scheduleCreations.add(1);

      // Read back user schedules
      const listRes = http.get(`${BASE_URL}/schedules`, { headers: authHeaders });
      check(listRes, {
        'schedules fetched 200': (r) => r.status === 200,
        'schedules list is array': (r) => Array.isArray(r.json()),
      });
    } else {
      failureRate.add(1);
    }
  });

  // 4. Task Creation
  if (scheduleId) {
    group('04_Task_Creation', () => {
      const taskPayload = JSON.stringify({
        title: `Task for VU ${vu} - ${Date.now()}`,
        description: 'Baseline performance testing task',
        estimatedDurationMinutes: 60,
        remainingDurationMinutes: 60,
        priority: 'HIGH',
        deadline: new Date(Date.now() + 86400000).toISOString(),
      });

      const taskRes = http.post(`${BASE_URL}/schedules/${scheduleId}/tasks`, taskPayload, { headers: authHeaders });
      const taskCreated = check(taskRes, {
        'task created 201': (r) => r.status === 201,
        'task has id': (r) => r.json('id') !== undefined,
      });

      if (taskCreated) {
        taskId = taskRes.json('id');
        taskCreations.add(1);
      }
    });
  }

  // 5. Event Allocation (Linking Task if Available)
  if (scheduleId) {
    group('05_Event_Operations', () => {
      const startTime = new Date(Date.now() + 3600000).toISOString();
      const endTime = new Date(Date.now() + 5400000).toISOString();

      const eventPayload = JSON.stringify({
        title: `Concurrent Event VU ${vu}`,
        description: 'Allocated time slot',
        startsAt: startTime,
        endsAt: endTime,
        fixed: true,
        sourceTaskId: taskId,
      });

      const eventRes = http.post(`${BASE_URL}/schedules/${scheduleId}/events`, eventPayload, { headers: authHeaders });
      const eventCreated = check(eventRes, {
        'event created 201': (r) => r.status === 201,
      });

      if (eventCreated) {
        eventCreations.add(1);
      }

      // Fetch schedule events
      const getEventsRes = http.get(`${BASE_URL}/schedules/${scheduleId}/events`, { headers: authHeaders });
      check(getEventsRes, {
        'events fetched 200': (r) => r.status === 200,
      });
    });
  }

  // Realistic user think time between actions (1-3 seconds)
  sleep(Math.random() * 2 + 1);
}
