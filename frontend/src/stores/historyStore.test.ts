import { beforeEach, describe, expect, it } from 'vitest';
import { useHistoryStore } from './historyStore';

describe('historyStore', () => {
  beforeEach(() => {
    useHistoryStore.getState().clear();
  });

  it('records actions and allows undo / redo', async () => {
    let count = 0;

    useHistoryStore.getState().recordAction(
      {
        description: 'Increment count',
        undo: () => {
          count -= 1;
        },
        redo: () => {
          count += 1;
        },
      },
      { showToast: false }
    );

    expect(useHistoryStore.getState().canUndo()).toBe(true);
    expect(useHistoryStore.getState().canRedo()).toBe(false);

    count += 1;
    expect(count).toBe(1);

    const undone = await useHistoryStore.getState().undo();
    expect(undone).toBe(true);
    expect(count).toBe(0);
    expect(useHistoryStore.getState().canRedo()).toBe(true);

    const redone = await useHistoryStore.getState().redo();
    expect(redone).toBe(true);
    expect(count).toBe(1);
  });

  it('bounds undo stack to 50 items', () => {
    for (let i = 0; i < 65; i++) {
      useHistoryStore.getState().recordAction(
        {
          description: `Action ${i}`,
          undo: () => {},
          redo: () => {},
        },
        { showToast: false }
      );
    }

    expect(useHistoryStore.getState().undoStack.length).toBe(50);
    expect(useHistoryStore.getState().undoStack[49].description).toBe('Action 64');
  });

  it('clears redo stack upon new action', async () => {
    useHistoryStore.getState().recordAction(
      {
        description: 'Action 1',
        undo: () => {},
        redo: () => {},
      },
      { showToast: false }
    );

    await useHistoryStore.getState().undo();
    expect(useHistoryStore.getState().canRedo()).toBe(true);

    useHistoryStore.getState().recordAction(
      {
        description: 'Action 2',
        undo: () => {},
        redo: () => {},
      },
      { showToast: false }
    );

    expect(useHistoryStore.getState().canRedo()).toBe(false);
  });
});
