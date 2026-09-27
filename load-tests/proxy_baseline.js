import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate } from 'k6/metrics';

const failureRate = new Rate('proxy_failure_rate');

export const options = {
  vus: 3,
  duration: '30s',
  thresholds: {
    http_req_duration: ['p(95)<100', 'p(99)<250'],
    http_req_failed: ['rate<0.01'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:80/api/v1';

export default function () {
  const res = http.get(`${BASE_URL}/health`);
  const success = check(res, {
    'status is 200': (r) => r.status === 200,
    'pool is up': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.status === 'UP';
      } catch {
        return false;
      }
    },
  });

  failureRate.add(!success);
  sleep(0.75);
}
