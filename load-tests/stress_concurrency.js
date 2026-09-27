import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// Stress Metrics
const totalRequests = new Counter('stress_total_requests');
const conflictResponses = new Counter('version_conflicts_409');
const errorRate = new Rate('stress_error_rate');
const transactionLatency = new Trend('transaction_duration');

export const options = {
  stages: [
    { duration: '30s', target: 50 },  // Ramp to 50 VUs
    { duration: '1m', target: 100 },  // Ramp to 100 VUs (stress benchmark)
    { duration: '1m', target: 100 },  // Sustained high concurrency at 100 VUs
    { duration: '30s', target: 0 },   // Cool-down
  ],
  thresholds: {
    http_req_duration: ['p(95)<1500', 'p(99)<3000'], // P95 under 1.5s under 100 concurrent VUs
    stress_error_rate: ['rate<0.05'],                 // Failure rate strictly under 5% under extreme stress
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080/api/v1';
const ACTIVATION_KEY = __ENV.ACTIVATION_KEY || 'SMART-STAGE-825881097B854931';

function randomString(length = 8) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export default function () {
  const vu = __VU;
  const iter = __ITER;
  const email = `stress_${vu}_${iter}_${Date.now()}_${randomString()}@example.com`;
  const password = 'Password123!';

  let authToken = null;
  let scheduleId = null;
  let scheduleVersion = 0;
  let taskId = null;

  // 1. User Registration under high throughput
  group('Stress_Auth', () => {
    const regPayload = JSON.stringify({
      displayName: `Stress Worker ${vu}`,
      email: email,
      password: password,
      activationKey: ACTIVATION_KEY,
    });

    const clientIp = `10.1.${vu}.${(iter % 200) + 1}`;
    const headers = {
      'Content-Type': 'application/json',
      'X-Forwarded-For': clientIp,
    };
    const regRes = http.post(`${BASE_URL}/auth/register`, regPayload, { headers });
    totalRequests.add(1);

    if (regRes.status === 200 || regRes.status === 201) {
      authToken = regRes.json('accessToken') || regRes.json('token');
    } else if (regRes.status === 429) {
      // Rate limiting working as intended
      return;
    } else {
      errorRate.add(1);
      return;
    }
  });

  if (!authToken) {
    sleep(0.5);
    return;
  }

  const clientIp = `10.1.${vu}.${(iter % 200) + 1}`;
  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${authToken}`,
    'X-Forwarded-For': clientIp,
  };

  // 2. High-Frequency Schedule Creation & Retrieval
  group('Stress_Schedule_Operations', () => {
    const startTime = Date.now();
    const createRes = http.post(
      `${BASE_URL}/schedules`,
      JSON.stringify({
        name: `Stress Schedule VU-${vu}`,
        description: 'Testing schedule under stress',
        timezone: 'UTC',
        visibility: 'PRIVATE',
      }),
      { headers: authHeaders }
    );
    totalRequests.add(1);
    transactionLatency.add(Date.now() - startTime);

    if (createRes.status === 201) {
      scheduleId = createRes.json('id');
      scheduleVersion = createRes.json('version') || 0;
    } else {
      errorRate.add(1);
    }
  });

  // 3. Optimistic Locking & Schedule Update
  if (scheduleId) {
    group('Stress_Optimistic_Locking', () => {
      // Simulate an update with current version
      const updatePayload = JSON.stringify({
        name: `Updated Stress Schedule VU-${vu} (v${scheduleVersion})`,
        description: 'Testing version increment under concurrency',
        timezone: 'UTC',
        visibility: 'PRIVATE',
        version: scheduleVersion,
      });

      const updateRes = http.put(
        `${BASE_URL}/schedules/${scheduleId}`,
        updatePayload,
        {
          headers: authHeaders,
          responseCallback: http.expectedStatuses(200, 409),
        }
      );
      totalRequests.add(1);

      if (updateRes.status === 200) {
        scheduleVersion = updateRes.json('version');
      } else if (updateRes.status === 409) {
        conflictResponses.add(1);
      } else {
        errorRate.add(1);
      }

      // Simulate an intentional stale update collision
      const stalePayload = JSON.stringify({
        name: 'Deliberately Stale Update',
        timezone: 'UTC',
        version: 999999, // Intentional mismatch
      });

      const staleRes = http.put(
        `${BASE_URL}/schedules/${scheduleId}`,
        stalePayload,
        {
          headers: authHeaders,
          responseCallback: http.expectedStatuses(409),
        }
      );
      totalRequests.add(1);

      const isConflict = check(staleRes, {
        'stale version correctly returns 409 Conflict': (r) => r.status === 409,
      });
      if (isConflict) {
        conflictResponses.add(1);
      }
    });
  }

  // 4. Task Creation and Concurrent Event Durations
  if (scheduleId) {
    group('Stress_Task_and_Event_Allocation', () => {
      const taskRes = http.post(
        `${BASE_URL}/schedules/${scheduleId}/tasks`,
        JSON.stringify({
          title: `Stress Task VU-${vu}`,
          description: 'Stress test task description',
          estimatedDurationMinutes: 120,
          remainingDurationMinutes: 120,
          priority: 'HIGH',
        }),
        { headers: authHeaders }
      );
      totalRequests.add(1);

      if (taskRes.status === 201) {
        taskId = taskRes.json('id');
      }

      if (taskId) {
        // Allocate event linked to task
        const eventRes = http.post(
          `${BASE_URL}/schedules/${scheduleId}/events`,
          JSON.stringify({
            title: `Allocated Slot VU-${vu}`,
            startsAt: new Date(Date.now() + 7200000).toISOString(),
            endsAt: new Date(Date.now() + 10800000).toISOString(),
            fixed: true,
            sourceTaskId: taskId,
          }),
          { headers: authHeaders }
        );
        totalRequests.add(1);

        check(eventRes, {
          'event allocated under stress 201': (r) => r.status === 201,
        });
      }
    });
  }

  // Short pause between iterations to prevent network socket exhaustion
  sleep(0.5);
}
