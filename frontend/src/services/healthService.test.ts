import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import {
  pingBackendHealth,
  getLastHealthResult,
  HEALTH_STATUS_EVENT,
  type HealthCheckResult,
} from './healthService';
import * as apiClient from './apiClient';

describe('healthService — pingBackendHealth', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(apiClient, 'getApiBaseUrl').mockReturnValue('http://127.0.0.1:8080/api/v1');
    vi.spyOn(apiClient, 'getRawApiUrl').mockReturnValue('http://127.0.0.1:8080');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('1. Successfully pings backend health when server responds 200 UP', async () => {
    vi.spyOn(axios, 'get').mockResolvedValue({
      status: 200,
      data: { status: 'UP', service: 'smartschedule-api', buildVersion: 'v1.0-test' },
    });

    const result = await pingBackendHealth({ slowThresholdMs: 3000, timeoutMs: 5000 });

    expect(result.status).toBe('CONNECTED');
    expect(result.isUp).toBe(true);
    expect(result.service).toBe('smartschedule-api');
    expect(result.buildVersion).toBe('v1.0-test');
    expect(typeof result.latencyMs).toBe('number');
    expect(getLastHealthResult()?.status).toBe('CONNECTED');
  });

  it('2. Classifies status as SLOW when response latency exceeds slowThresholdMs', async () => {
    vi.spyOn(axios, 'get').mockImplementation(async () => {
      await new Promise((resolve) => setTimeout(resolve, 60));
      return {
        status: 200,
        data: { status: 'UP' },
      };
    });

    // Set threshold very low (20ms) so 60ms counts as SLOW
    const result = await pingBackendHealth({ slowThresholdMs: 20, timeoutMs: 1000 });

    expect(result.status).toBe('SLOW');
    expect(result.isUp).toBe(true);
    expect(result.isSlow).toBe(true);
    expect(result.latencyMs).toBeGreaterThanOrEqual(20);
  });

  it('3. Classifies status as FAILED when server returns HTTP error status', async () => {
    vi.spyOn(axios, 'get').mockRejectedValue({
      response: {
        status: 503,
        statusText: 'Service Unavailable',
      },
    });

    const result = await pingBackendHealth({ timeoutMs: 2000 });

    expect(result.status).toBe('FAILED');
    expect(result.isUp).toBe(false);
    expect(result.error).toContain('HTTP Error 503');
  });

  it('4. Classifies status as FAILED when network is unreachable', async () => {
    vi.spyOn(axios, 'get').mockRejectedValue({
      message: 'Network Error',
      code: 'ERR_NETWORK',
    });

    const result = await pingBackendHealth({ timeoutMs: 2000 });

    expect(result.status).toBe('FAILED');
    expect(result.isUp).toBe(false);
    expect(result.error).toContain('Network unreachable');
  });

  it('5. Handles timeout cleanly and notes cold start possibility', async () => {
    vi.spyOn(axios, 'get').mockRejectedValue({
      name: 'CanceledError',
      code: 'ERR_CANCELED',
      message: 'canceled',
    });

    const result = await pingBackendHealth({ timeoutMs: 7000 });

    expect(result.status).toBe('FAILED');
    expect(result.error).toContain('timed out');
    expect(result.error).toContain('cold start');
  });
});
