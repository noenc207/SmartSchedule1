import type { Category, EventItem, Task } from '../../../types/domain';

export interface ColorSwatch {
  id: string;
  name: string;
  hex: string;
  darkHex: string;
}

export const COLOR_PALETTE: ColorSwatch[] = [
  { id: 'fpt-orange', name: 'FPT Orange', hex: '#ea580c', darkHex: '#f97316' },
  { id: 'fpt-blue', name: 'FPT Blue', hex: '#0047ba', darkHex: '#3b82f6' },
  { id: 'fpt-green', name: 'FPT Green', hex: '#009a3e', darkHex: '#22c55e' },
  { id: 'purple', name: 'Purple', hex: '#9333ea', darkHex: '#a855f7' },
  { id: 'amber', name: 'Amber', hex: '#d97706', darkHex: '#f59e0b' },
  { id: 'red', name: 'Red', hex: '#dc2626', darkHex: '#ef4444' },
  { id: 'teal', name: 'Teal', hex: '#0d9488', darkHex: '#14b8a6' },
  { id: 'pink', name: 'Pink', hex: '#db2777', darkHex: '#ec4899' },
  { id: 'slate', name: 'Slate', hex: '#475569', darkHex: '#64748b' },
];

export function resolveTaskColor(
  task: Partial<Task>,
  category?: Category
): { color: string; isCustom: boolean; source: 'task' | 'category' | 'default' } {
  if (task.color) {
    return { color: task.color, isCustom: true, source: 'task' };
  }
  if (category?.color) {
    return { color: category.color, isCustom: false, source: 'category' };
  }
  return {
    color: '#ea580c', // FPT Orange default for tasks
    isCustom: false,
    source: 'default',
  };
}

export function resolveEventColor(
  event: Partial<EventItem>,
  category?: Category,
  task?: Task
): { color: string; isCustom: boolean; source: 'event' | 'task' | 'category' | 'default' } {
  if (event.color) {
    return { color: event.color, isCustom: true, source: 'event' };
  }
  if (task?.color) {
    return { color: task.color, isCustom: false, source: 'task' };
  }
  if (category?.color) {
    return { color: category.color, isCustom: false, source: 'category' };
  }
  const isFixed = Boolean(event.fixed || event.locked);
  return {
    color: isFixed ? '#0047ba' : '#ea580c',
    isCustom: false,
    source: 'default',
  };
}
