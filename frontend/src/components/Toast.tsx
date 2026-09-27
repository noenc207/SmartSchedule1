import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';

export type ToastType = 'info' | 'success' | 'warning' | 'error';

export interface ToastItem {
  id: string | number;
  message: string;
  type: ToastType;
  durationMs: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function showToast(
  message: string,
  type: ToastType = 'info',
  durationOrOptions: number | { durationMs?: number; action?: { label: string; onClick: () => void } } = 3200,
  action?: { label: string; onClick: () => void }
) {
  const durationMs = typeof durationOrOptions === 'number' ? durationOrOptions : durationOrOptions.durationMs ?? 3200;
  const resolvedAction = typeof durationOrOptions === 'object' && durationOrOptions.action ? durationOrOptions.action : action;

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent<ToastItem>('smartschedule:toast', {
        detail: {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          message,
          type,
          durationMs,
          action: resolvedAction,
        },
      })
    );
  }
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const handleToast = (event: Event) => {
      const customEvent = event as CustomEvent<ToastItem>;
      if (!customEvent.detail) return;
      const newToast = customEvent.detail;
      setToasts((current) => [...current.slice(-4), newToast]);

      window.setTimeout(() => {
        setToasts((current) => current.filter((item) => item.id !== newToast.id));
      }, newToast.durationMs);
    };

    window.addEventListener('smartschedule:toast', handleToast);
    return () => window.removeEventListener('smartschedule:toast', handleToast);
  }, []);

  const removeToast = (id: string | number) => {
    setToasts((current) => current.filter((item) => item.id !== id));
  };

  if (toasts.length === 0) return null;

  return (
    <aside className="toast-container" aria-live="polite" aria-label="Notifications">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast-item toast-${toast.type}`} role="status">
          <span className="toast-icon">
            {toast.type === 'success' && <CheckCircle2 size={16} />}
            {toast.type === 'warning' && <AlertTriangle size={16} />}
            {toast.type === 'error' && <AlertTriangle size={16} />}
            {toast.type === 'info' && <Info size={16} />}
          </span>
          <span className="toast-message">{toast.message}</span>
          {toast.action && (
            <button
              type="button"
              className="toast-action-btn"
              onClick={() => {
                toast.action?.onClick();
                removeToast(toast.id);
              }}
            >
              {toast.action.label}
            </button>
          )}
          <button
            type="button"
            className="toast-close"
            onClick={() => removeToast(toast.id)}
            aria-label="Dismiss notification"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </aside>
  );
}
