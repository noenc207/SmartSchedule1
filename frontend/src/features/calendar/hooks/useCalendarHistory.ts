import { useEffect } from 'react';
import { useHistoryStore, initHistoryKeyboardShortcuts, type HistoryAction } from '../../../stores/historyStore';

export type { HistoryAction };

export function useCalendarHistory() {
  const recordAction = useHistoryStore((s) => s.recordAction);
  const undo = useHistoryStore((s) => s.undo);
  const redo = useHistoryStore((s) => s.redo);
  const canUndo = useHistoryStore((s) => s.undoStack.length > 0);
  const canRedo = useHistoryStore((s) => s.redoStack.length > 0);

  // Initialize keyboard listeners on mount
  useEffect(() => {
    const cleanup = initHistoryKeyboardShortcuts();
    return cleanup;
  }, []);

  return {
    recordAction,
    undo,
    redo,
    canUndo,
    canRedo,
  };
}

