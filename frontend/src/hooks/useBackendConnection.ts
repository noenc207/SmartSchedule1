import { useState, useEffect, useCallback, useRef } from 'react';
import {
  pingBackendHealth,
  getLastHealthResult,
  HEALTH_STATUS_EVENT,
  type ConnectionStatus,
  type HealthCheckResult,
} from '../services/healthService';
import { getRawApiUrl, setCustomApiUrl, CUSTOM_API_URL_KEY } from '../services/apiClient';

export interface UseBackendConnectionOptions {
  autoCheck?: boolean;
  slowThresholdMs?: number;
  timeoutMs?: number;
}

export function useBackendConnection(options: UseBackendConnectionOptions = {}) {
  const { autoCheck = false, slowThresholdMs = 3500, timeoutMs = 7000 } = options;

  const [result, setResult] = useState<HealthCheckResult | null>(() => getLastHealthResult());
  const [status, setStatus] = useState<ConnectionStatus>(() => getLastHealthResult()?.status ?? 'CHECKING');
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const mountedRef = useRef(true);

  const check = useCallback(async () => {
    setIsChecking(true);
    setStatus((prev) => (prev === 'CONNECTED' ? 'CHECKING' : 'CONNECTING'));
    try {
      const res = await pingBackendHealth({ slowThresholdMs, timeoutMs });
      if (mountedRef.current) {
        setResult(res);
        setStatus(res.status);
      }
      return res;
    } finally {
      if (mountedRef.current) {
        setIsChecking(false);
      }
    }
  }, [slowThresholdMs, timeoutMs]);

  useEffect(() => {
    mountedRef.current = true;

    const handleEvent = (e: Event) => {
      const customEvent = e as CustomEvent<HealthCheckResult>;
      if (customEvent.detail && mountedRef.current) {
        setResult(customEvent.detail);
        setStatus(customEvent.detail.status);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener(HEALTH_STATUS_EVENT, handleEvent);
    }

    if (autoCheck && !getLastHealthResult()) {
      void check();
    }

    return () => {
      mountedRef.current = false;
      if (typeof window !== 'undefined') {
        window.removeEventListener(HEALTH_STATUS_EVENT, handleEvent);
      }
    };
  }, [autoCheck, check]);

  const updateUrl = useCallback((newUrl: string | null) => {
    setCustomApiUrl(newUrl);
    void check();
  }, [check]);

  return {
    status,
    result,
    isChecking,
    check,
    currentUrl: getRawApiUrl(),
    updateUrl,
    isSlow: result?.isSlow ?? false,
    latencyMs: result?.latencyMs ?? null,
  };
}
