import type { Category, EventItem, Task } from '../../../types/domain';
import {
  getTaskRemainingMinutes,
  getTaskSchedulingState,
} from '../../scheduling/utils/taskCalculations';
import type {
  TaskFilterDeadline,
  TaskFilterPriority,
  TaskFilterStatus,
  TaskSortOption,
} from '../../../stores/preferenceStore';

export interface FilterAndSortOptions {
  searchQuery?: string;
  statusFilter?: TaskFilterStatus;
  priorityFilter?: TaskFilterPriority;
  deadlineFilter?: TaskFilterDeadline;
  sortBy?: TaskSortOption;
  selectedIds?: string[];
  events?: EventItem[];
  categories?: Category[];
  nowTimestamp?: number;
}

const PRIORITY_ORDER: Record<string, number> = {
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

export function filterAndSortTasks(tasks: Task[], options: FilterAndSortOptions): Task[] {
  const {
    searchQuery = '',
    statusFilter = 'ALL',
    priorityFilter = 'ALL',
    deadlineFilter = 'ALL',
    sortBy = 'DEADLINE',
    selectedIds = [],
    events = [],
    categories = [],
    nowTimestamp = Date.now(),
  } = options;

  const query = searchQuery.trim().toLowerCase();
  const categoryMap = new Map(categories.map((c) => [c.id, c.name.toLowerCase()]));

  // 1. Filter
  const filtered = tasks.filter((task) => {
    // Search query matching: title, description, category name, priority
    if (query) {
      const matchTitle = task.title.toLowerCase().includes(query);
      const matchDesc = task.description ? task.description.toLowerCase().includes(query) : false;
      const catName = task.categoryId ? categoryMap.get(task.categoryId) ?? '' : '';
      const matchCat = catName.includes(query);
      const matchPriority = task.priority.toLowerCase().includes(query);

      if (!matchTitle && !matchDesc && !matchCat && !matchPriority) {
        return false;
      }
    }

    // Status filter
    if (statusFilter !== 'ALL') {
      if (statusFilter === 'SELECTED') {
        if (!selectedIds.includes(task.id)) return false;
      } else {
        const state = getTaskSchedulingState(task, events);
        if (state !== statusFilter) return false;
      }
    }

    // Priority filter
    if (priorityFilter !== 'ALL') {
      if (task.priority !== priorityFilter) return false;
    }

    // Deadline filter
    if (deadlineFilter !== 'ALL') {
      if (!task.deadline) return false;
      const deadlineDate = new Date(task.deadline);
      const nowDate = new Date(nowTimestamp);
      const dStart = Date.UTC(deadlineDate.getUTCFullYear(), deadlineDate.getUTCMonth(), deadlineDate.getUTCDate());
      const nStart = Date.UTC(nowDate.getUTCFullYear(), nowDate.getUTCMonth(), nowDate.getUTCDate());
      const diffDays = Math.round((dStart - nStart) / 86400000);

      switch (deadlineFilter) {
        case 'TODAY':
          if (diffDays !== 0) return false;
          break;
        case 'TOMORROW':
          if (diffDays !== 1) return false;
          break;
        case '3DAYS':
          if (diffDays < 0 || diffDays > 3) return false;
          break;
        case '7DAYS':
          if (diffDays < 0 || diffDays > 7) return false;
          break;
        case 'OVERDUE':
          if (new Date(task.deadline).getTime() >= nowTimestamp && diffDays >= 0) return false;
          break;
        default:
          break;
      }
    }


    return true;
  });

  // 2. Sort
  return [...filtered].sort((a, b) => {
    switch (sortBy) {
      case 'DEADLINE': {
        if (!a.deadline && !b.deadline) return 0;
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      }
      case 'PRIORITY': {
        const pA = PRIORITY_ORDER[a.priority] || 0;
        const pB = PRIORITY_ORDER[b.priority] || 0;
        return pB - pA;
      }
      case 'DURATION_DESC': {
        const durA = getTaskRemainingMinutes(a, events);
        const durB = getTaskRemainingMinutes(b, events);
        return durB - durA;
      }
      case 'DURATION_ASC': {
        const durA = getTaskRemainingMinutes(a, events);
        const durB = getTaskRemainingMinutes(b, events);
        return durA - durB;
      }
      case 'TITLE': {
        return a.title.localeCompare(b.title);
      }
      default:
        return 0;
    }
  });
}
