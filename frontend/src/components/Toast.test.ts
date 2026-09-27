import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { showToast, type ToastItem } from './Toast';

describe('Toast notification system', () => {
  const originalWindow = globalThis.window;

  beforeEach(() => {
    const listeners: Record<string, ((event: any) => void)[]> = {};
    (globalThis as any).window = {
      addEventListener: (type: string, listener: (event: any) => void) => {
        listeners[type] = listeners[type] || [];
        listeners[type].push(listener);
      },
      removeEventListener: (type: string, listener: (event: any) => void) => {
        if (!listeners[type]) return;
        listeners[type] = listeners[type].filter((l) => l !== listener);
      },
      dispatchEvent: (event: any) => {
        if (listeners[event.type]) {
          listeners[event.type].forEach((l) => l(event));
        }
        return true;
      },
    };
    (globalThis as any).CustomEvent = class {
      type: string;
      detail: any;
      constructor(type: string, init?: { detail: any }) {
        this.type = type;
        this.detail = init?.detail;
      }
    };
  });

  afterEach(() => {
    (globalThis as any).window = originalWindow;
  });

  it('dispatches custom event on window with proper detail payload', () => {
    const handler = vi.fn();
    window.addEventListener('smartschedule:toast', handler);

    showToast('Schedule applied successfully', 'success', 2500);

    expect(handler).toHaveBeenCalledTimes(1);
    const event = handler.mock.calls[0][0] as CustomEvent<ToastItem>;
    expect(event.detail.message).toBe('Schedule applied successfully');
    expect(event.detail.type).toBe('success');
    expect(event.detail.durationMs).toBe(2500);

    window.removeEventListener('smartschedule:toast', handler);
  });

  it('uses default info type and duration if not provided', () => {
    const handler = vi.fn();
    window.addEventListener('smartschedule:toast', handler);

    showToast('Default notification');

    expect(handler).toHaveBeenCalledTimes(1);
    const event = handler.mock.calls[0][0] as CustomEvent<ToastItem>;
    expect(event.detail.message).toBe('Default notification');
    expect(event.detail.type).toBe('info');
    expect(event.detail.durationMs).toBe(3200);

    window.removeEventListener('smartschedule:toast', handler);
  });

  it('supports action callback payload for undo', () => {
    const handler = vi.fn();
    window.addEventListener('smartschedule:toast', handler);
    const onUndo = vi.fn();

    showToast('Event moved', 'info', 4000, { label: 'Undo', onClick: onUndo });

    expect(handler).toHaveBeenCalledTimes(1);
    const event = handler.mock.calls[0][0] as CustomEvent<ToastItem>;
    expect(event.detail.action?.label).toBe('Undo');
    event.detail.action?.onClick();
    expect(onUndo).toHaveBeenCalledTimes(1);

    window.removeEventListener('smartschedule:toast', handler);
  });
});
