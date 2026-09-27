import type { EventInput as CalendarInput } from '@fullcalendar/core';
import type { Category, EventItem, Task } from '../../../types/domain';
import { resolveEventColor } from './colorPalette';
import { DEFAULT_TIMEZONE, formatForInput } from '../../../utils/dateTime';

export function toCalendarEvent(
  event: EventItem,
  categories: Category[],
  tasks?: Task[],
  hasConflict = false,
  timeZone: string = DEFAULT_TIMEZONE
): CalendarInput {
  const category = categories.find((item) => item.id === event.categoryId);
  const task = tasks?.find((t) => t.id === event.taskId || t.id === event.sourceTaskId || (event.notes && event.notes.includes(t.id)));
  const isFixed = Boolean(event.fixed || event.locked);
  const { color, isCustom, source } = resolveEventColor(event, category, task);

  const startStr = formatForInput(event.startsAt, timeZone);
  const endStr = formatForInput(event.endsAt, timeZone);
  const safeStart = startStr || (event.startsAt && !isNaN(new Date(event.startsAt).getTime()) ? event.startsAt : new Date().toISOString());
  const safeEnd = endStr || (event.endsAt && !isNaN(new Date(event.endsAt).getTime()) ? event.endsAt : undefined);

  return {
    id: event.occurrenceId || event.id,
    groupId: event.seriesId || event.id,
    title: event.title,
    start: safeStart,
    end: safeEnd,
    editable: !event.locked && event.seriesId === event.id,
    borderColor: hasConflict ? 'var(--danger, #dc2626)' : color,
    backgroundColor: `color-mix(in srgb, ${color} 14%, var(--surface))`,
    textColor: color,
    classNames: [
      isFixed ? 'calendar-event-fixed' : 'calendar-event-task',
      event.status === 'COMPLETED' ? 'calendar-event-completed' : '',
      event.locked ? 'calendar-event-locked' : '',
      isCustom ? 'calendar-event-custom-color' : '',
      hasConflict ? 'calendar-event-conflict' : '',
    ].filter(Boolean),
    extendedProps: {
      domainEventId: event.id,
      event,
      category,
      color,
      isCustomColor: isCustom,
      colorSource: source,
      hasConflict,
      kind: 'event',
    },
  };
}
