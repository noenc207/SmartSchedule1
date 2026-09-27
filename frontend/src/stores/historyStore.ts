import { create } from 'zustand';
import { showToast } from '../components/Toast';

export interface HistoryAction {
  id: string;
  description: string;
  undo: () => Promise<void> | void;
  redo: () => Promise<void> | void;
  timestamp?: number;
}

interface HistoryState {
  undoStack: HistoryAction[];
  redoStack: HistoryAction[];
  isExecuting: boolean;

  recordAction: (
    action: { description: string; undo: () => Promise<void> | void; redo: () => Promise<void> | void },
    options?: { showToast?: boolean }
  ) => void;
  undo: () => Promise<boolean>;
  redo: () => Promise<boolean>;
  clear: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

const MAX_HISTORY_SIZE = 50;

export const useHistoryStore = create<HistoryState>((set, get) => ({
  undoStack: [],
  redoStack: [],
  isExecuting: false,

  recordAction: (action, options = { showToast: true }) => {
    const fullAction: HistoryAction = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      description: action.description,
      undo: action.undo,
      redo: action.redo,
      timestamp: Date.now(),
    };

    set((state) => ({
      undoStack: [...state.undoStack.slice(-(MAX_HISTORY_SIZE - 1)), fullAction],
      redoStack: [], // Clear redo history upon new user action
    }));

    if (options.showToast !== false) {
      showToast(action.description, 'info', 4500, {
        label: 'Undo',
        onClick: () => {
          void get().undo();
        },
      });
    }
  },

  undo: async () => {
    const state = get();
    if (state.isExecuting || state.undoStack.length === 0) return false;

    const currentStack = [...state.undoStack];
    const action = currentStack.pop();
    if (!action) return false;

    set({ isExecuting: true });
    try {
      await action.undo();
      set((s) => ({
        undoStack: currentStack,
        redoStack: [...s.redoStack.slice(-(MAX_HISTORY_SIZE - 1)), action],
        isExecuting: false,
      }));
      showToast(`Undone: ${action.description}`, 'info', 2500, {
        label: 'Redo',
        onClick: () => {
          void get().redo();
        },
      });
      return true;
    } catch (err) {
      set({ isExecuting: false });
      showToast(`Could not undo "${action.description}"`, 'error');
      return false;
    }
  },

  redo: async () => {
    const state = get();
    if (state.isExecuting || state.redoStack.length === 0) return false;

    const currentStack = [...state.redoStack];
    const action = currentStack.pop();
    if (!action) return false;

    set({ isExecuting: true });
    try {
      await action.redo();
      set((s) => ({
        redoStack: currentStack,
        undoStack: [...s.undoStack.slice(-(MAX_HISTORY_SIZE - 1)), action],
        isExecuting: false,
      }));
      showToast(`Redone: ${action.description}`, 'info', 2500, {
        label: 'Undo',
        onClick: () => {
          void get().undo();
        },
      });
      return true;
    } catch (err) {
      set({ isExecuting: false });
      showToast(`Could not redo "${action.description}"`, 'error');
      return false;
    }
  },

  clear: () => set({ undoStack: [], redoStack: [], isExecuting: false }),
  canUndo: () => get().undoStack.length > 0,
  canRedo: () => get().redoStack.length > 0,
}));

/**
 * Initializes global keyboard listeners for Ctrl+Z and Ctrl+Y / Ctrl+Shift+Z
 */
export function initHistoryKeyboardShortcuts() {
  if (typeof window === 'undefined') return () => {};

  const handleKeyDown = (event: KeyboardEvent) => {
    const target = event.target as HTMLElement | null;
    if (target) {
      const tagName = target.tagName?.toLowerCase();
      if (tagName === 'input' || tagName === 'textarea' || tagName === 'select' || target.isContentEditable) {
        return;
      }
    }

    const isMac = typeof navigator !== 'undefined' && /Mac/i.test(navigator.platform);
    const mod = isMac ? event.metaKey : event.ctrlKey;

    if (mod && event.key.toLowerCase() === 'z') {
      event.preventDefault();
      if (event.shiftKey) {
        void useHistoryStore.getState().redo();
      } else {
        void useHistoryStore.getState().undo();
      }
    } else if (mod && event.key.toLowerCase() === 'y') {
      event.preventDefault();
      void useHistoryStore.getState().redo();
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}
