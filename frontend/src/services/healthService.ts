import axios from 'axios';
import { getApiBaseUrl, getRawApiUrl } from './apiClient';
import { isDemoMode } from './demoMode';

export type ConnectionStatus = 'CHECKING' | 'CONNECTING' | 'SLOW' | 'CONNECTED' | 'FAILED';

export interface HealthCheckResult {
  status: ConnectionStatus;
  isUp: boolean;
  latencyMs: number | null;
  service?: string;
  buildVersion?: string;
  targetUrl: string;
  error: string | null;
  timestamp: string;
  isSlow: boolean;
}

let cachedHealthResult: HealthCheckResult | null = null;
let activeCheckPromise: Promise<HealthCheckResult> | null = null;

export const HEALTH_STATUS_EVENT = 'smartschedule:backend-status';

export function getLastHealthResult(): HealthCheckResult | null {
  return cachedHealthResult;
}

/**
 * Ping backend health endpoint /api/v1/health with timeout & latency measurement.
 * Never performs infinite polling loops.
 */
export async function pingBackendHealth(options: {
  timeoutMs?: number;
  slowThresholdMs?: number;
} = {}): Promise<HealthCheckResult> {
  const timeoutMs = options.timeoutMs ?? 7000;
  const slowThresholdMs = options.slowThresholdMs ?? 3500;
  const targetUrl = getRawApiUrl();

  // Deduplicate concurrent health checks
  if (activeCheckPromise) {
    return activeCheckPromise;
  }

  activeCheckPromise = (async () => {
    const startTime = Date.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let isSlow = false;
    const slowTimer = setTimeout(() => {
      isSlow = true;
      const interim: HealthCheckResult = {
        status: 'SLOW',
        isUp: false,
        latencyMs: Date.now() - startTime,
        targetUrl,
        error: null,
        timestamp: new Date().toISOString(),
        isSlow: true,
      };
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(HEALTH_STATUS_EVENT, { detail: interim }));
      }
    }, slowThresholdMs);

    try {
      if (typeof window !== 'undefined') {
        const initial: HealthCheckResult = {
          status: 'CONNECTING',
          isUp: false,
          latencyMs: null,
          targetUrl,
          error: null,
          timestamp: new Date().toISOString(),
          isSlow: false,
        };
        window.dispatchEvent(new CustomEvent(HEALTH_STATUS_EVENT, { detail: initial }));
      }

      const response = await axios.get<{
        status?: string;
        service?: string;
        buildVersion?: string;
      }>(`${getApiBaseUrl()}/health`, {
        signal: controller.signal,
        timeout: timeoutMs,
        withCredentials: true,
      });

      const elapsed = Date.now() - startTime;
      const isUp = response.data?.status === 'UP' || response.status === 200;
      const isSlowResponse = isSlow || elapsed >= slowThresholdMs;

      const result: HealthCheckResult = {
        status: isUp ? (isSlowResponse ? 'SLOW' : 'CONNECTED') : 'FAILED',
        isUp,
        latencyMs: elapsed,
        service: response.data?.service || 'smartschedule-api',
        buildVersion: response.data?.buildVersion || 'production',
        targetUrl,
        error: isUp ? null : 'Server reported non-operational health status.',
        timestamp: new Date().toISOString(),
        isSlow: isSlowResponse,
      };

      cachedHealthResult = result;
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(HEALTH_STATUS_EVENT, { detail: result }));
      }
      return result;
    } catch (err: any) {
      const elapsed = Date.now() - startTime;
      let errorMsg = 'Cannot connect to backend server.';

      if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED' || err.code === 'ECONNABORTED') {
        errorMsg = `Connection timed out after ${(timeoutMs / 1000).toFixed(0)}s. Server might be undergoing cold start.`;
      } else if (err.response?.status) {
        errorMsg = `HTTP Error ${err.response.status}: ${err.response.statusText || 'Unexpected server response'}`;
      } else if (err.message === 'Network Error' || err.code === 'ERR_NETWORK') {
        errorMsg = `Network unreachable (${targetUrl}). Check your internet connection or server CORS.`;
      } else if (err.message) {
        errorMsg = err.message;
      }

      const result: HealthCheckResult = {
        status: 'FAILED',
        isUp: false,
        latencyMs: elapsed,
        targetUrl,
        error: errorMsg,
        timestamp: new Date().toISOString(),
        isSlow: elapsed >= slowThresholdMs,
      };

      cachedHealthResult = result;
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(HEALTH_STATUS_EVENT, { detail: result }));
      }
      return result;
    } finally {
      clearTimeout(timer);
      clearTimeout(slowTimer);
      activeCheckPromise = null;
    }
  })();

  return activeCheckPromise;
}
