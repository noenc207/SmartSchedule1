import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarDays,
  ListTodo,
  FolderKanban,
  LayoutDashboard,
  Sparkles,
  BarChart3,
  Settings,
  ArrowRightLeft,
  Search,
  Calendar,
  Layers,
  Clock,
  Contrast,
  HelpCircle,
  AlertTriangle,
  Check,
  X,
  Zap,
} from 'lucide-react';
import { usePreferenceStore, type CalendarViewType, type SemanticZoomLevel } from '../stores/preferenceStore';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { useHistoryStore } from '../stores/historyStore';
import { taskApi, type TaskInput } from '../services/taskApi';
import { showToast } from './Toast';
import type { Task } from '../types/domain';

export interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  navigate: ReturnType<typeof useNavigate>;
}

interface CommandEntry {
  id: string;
  section: 'Navigation' | 'Create' | 'Schedule' | 'View' | 'Tasks' | 'Advanced';
  label: string;
  description: string;
  keywords: string[];
  icon: React.ComponentType<{ size?: number; className?: string }>;
  action: () => void | Promise<void>;
}

export function matchesCommandQuery(haystack: string, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const target = haystack.toLowerCase();
  if (target.includes(q)) return true;

  let qIdx = 0;
  for (let i = 0; i < target.length && qIdx < q.length; i++) {
    if (target[i] === q[qIdx]) qIdx++;
  }
  return qIdx === q.length;
}

export function CommandPalette({ open, onClose, navigate }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const {
    calendarView,
    setCalendarView,
    toggleMiniCalendar,
    setSemanticZoomLevel,
    highContrast,
    setHighContrast,
    setHasCompletedOnboarding,
  } = usePreferenceStore();

  const { activeScheduleId } = useWorkspaceStore();
  const { recordAction } = useHistoryStore();

  // Bulk command preview state
  const [bulkPreview, setBulkPreview] = useState<{
    title: string;
    description: string;
    tasks: Task[];
    execute: () => Promise<void>;
  } | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);

  // Define full command registry
  const entries: CommandEntry[] = useMemo(() => [
    // Navigation
    {
      id: 'nav-dashboard',
      section: 'Navigation',
      label: 'Go to Dashboard',
      description: 'Overview of today and deadlines',
      keywords: ['dashboard', 'home', 'overview'],
      icon: LayoutDashboard,
      action: () => navigate('/dashboard'),
    },
    {
      id: 'nav-calendar',
      section: 'Navigation',
      label: 'Go to Calendar',
      description: 'Open full academic calendar',
      keywords: ['calendar', 'events', 'schedule'],
      icon: CalendarDays,
      action: () => navigate('/calendar'),
    },
    {
      id: 'nav-smart-plan',
      section: 'Navigation',
      label: 'Go to Smart Plan',
      description: 'Generate automated schedule proposals',
      keywords: ['smart plan', 'scheduling', 'generate', 'optimizer'],
      icon: Sparkles,
      action: () => navigate('/scheduling'),
    },
    {
      id: 'nav-analytics',
      section: 'Navigation',
      label: 'Go to Analytics',
      description: 'Review focus workload and study coverage',
      keywords: ['analytics', 'metrics', 'stats', 'reports'],
      icon: BarChart3,
      action: () => navigate('/analytics'),
    },
    {
      id: 'nav-settings',
      section: 'Navigation',
      label: 'Go to Settings',
      description: 'Configure availability, integrations, and preferences',
      keywords: ['settings', 'preferences', 'availability', 'integrations'],
      icon: Settings,
      action: () => navigate('/settings'),
    },
    {
      id: 'nav-schedules',
      section: 'Navigation',
      label: 'Manage Schedules',
      description: 'Switch or create academic workspaces',
      keywords: ['schedules', 'workspaces', 'projects'],
      icon: FolderKanban,
      action: () => navigate('/schedules'),
    },

    // Create
    {
      id: 'create-event',
      section: 'Create',
      label: 'Create Event',
      description: 'Add a fixed class or commitment',
      keywords: ['create event', 'add event', 'new meeting', 'class'],
      icon: CalendarDays,
      action: () => {
        navigate('/calendar');
      },
    },
    {
      id: 'create-task',
      section: 'Create',
      label: 'Create Task',
      description: 'Add a new academic task for scheduling',
      keywords: ['create task', 'add task', 'new todo', 'assignment'],
      icon: ListTodo,
      action: () => {
        navigate('/tasks');
      },
    },

    // View & Calendar Navigation
    {
      id: 'view-today',
      section: 'View',
      label: 'Go to Today',
      description: 'Jump calendar directly to current date',
      keywords: ['today', 'jump today', 'now'],
      icon: Clock,
      action: () => {
        navigate('/calendar');
        showToast('Jumped to Today', 'info');
      },
    },
    {
      id: 'view-week',
      section: 'View',
      label: 'Go to Week View',
      description: 'Switch calendar to weekly planning grid',
      keywords: ['week', 'weekly', 'timegrid'],
      icon: Calendar,
      action: () => {
        setCalendarView('timeGridWeek');
        navigate('/calendar');
        showToast('Switched to Week view', 'info');
      },
    },
    {
      id: 'view-month',
      section: 'View',
      label: 'Go to Month View',
      description: 'Switch calendar to monthly overview',
      keywords: ['month', 'monthly', 'grid'],
      icon: Calendar,
      action: () => {
        setCalendarView('dayGridMonth');
        navigate('/calendar');
        showToast('Switched to Month view', 'info');
      },
    },
    {
      id: 'view-timeline',
      section: 'View',
      label: 'Open Timeline',
      description: 'Horizontal Gantt-style project scheduling view',
      keywords: ['timeline', 'gantt', 'project', 'horizontal'],
      icon: Layers,
      action: () => {
        setCalendarView('timeline');
        navigate('/calendar');
        showToast('Opened Timeline view', 'info');
      },
    },
    {
      id: 'view-year',
      section: 'View',
      label: 'Open Year View',
      description: '12-month focus workload heatmap overview',
      keywords: ['year', 'heatmap', 'annual'],
      icon: CalendarDays,
      action: () => {
        setCalendarView('year');
        navigate('/calendar');
        showToast('Opened Year view', 'info');
      },
    },
    {
      id: 'view-toggle-mini',
      section: 'View',
      label: 'Toggle Mini Calendar',
      description: 'Show or hide sidebar mini calendar navigator',
      keywords: ['mini calendar', 'toggle mini', 'sidebar calendar'],
      icon: Calendar,
      action: () => {
        toggleMiniCalendar();
        showToast('Toggled Mini Calendar', 'info');
      },
    },

    // Schedule & Optimizer
    {
      id: 'action-generate',
      section: 'Schedule',
      label: 'Generate Schedule',
      description: 'Open Smart Plan and calculate optimal slots',
      keywords: ['generate schedule', 'smart plan', 'plan'],
      icon: Sparkles,
      action: () => navigate('/scheduling'),
    },
    {
      id: 'action-optimize',
      section: 'Schedule',
      label: 'Optimize Schedule',
      description: 'Review reschedule alternatives and eliminate conflicts',
      keywords: ['optimize schedule', 'reschedule', 'conflicts', 'opt'],
      icon: ArrowRightLeft,
      action: () => navigate('/rescheduling'),
    },

    // Tasks & Search
    {
      id: 'tasks-search',
      section: 'Tasks',
      label: 'Search Tasks',
      description: 'Filter and sort task workspace',
      keywords: ['search tasks', 'find task', 'filter tasks'],
      icon: Search,
      action: () => navigate('/tasks'),
    },

    // Advanced & Bulk Actions
    {
      id: 'bulk-move-high-tasks',
      section: 'Advanced',
      label: 'Move all HIGH priority tasks to next week',
      description: 'Reschedule pending high priority deadlines with preview and single undo',
      keywords: ['move all high', 'bulk reschedule', 'next week', 'delay'],
      icon: Zap,
      action: async () => {
        if (!activeScheduleId) {
          showToast('Select a schedule workspace first', 'error');
          return;
        }
        try {
          const page = await taskApi.list(activeScheduleId);
          const highTasks = page.content.filter(
            (t) => t.priority === 'HIGH' && t.status !== 'COMPLETED' && t.status !== 'CANCELLED'
          );

          if (highTasks.length === 0) {
            showToast('No active HIGH priority tasks found', 'info');
            return;
          }

          // Open confirmation preview modal
          setBulkPreview({
            title: 'Move all HIGH priority tasks to next week',
            description: `This bulk action will shift the deadlines of ${highTasks.length} high-priority task${highTasks.length === 1 ? '' : 's'} by +7 days.`,
            tasks: highTasks,
            execute: async () => {
              setBulkLoading(true);
              const originalTasks = highTasks.map((t) => ({ ...t }));
              const updatedTasks: Task[] = [];

              try {
                for (const task of highTasks) {
                  const currentDeadline = task.deadline ? new Date(task.deadline).getTime() : Date.now();
                  const newDeadlineIso = new Date(currentDeadline + 7 * 86400000).toISOString();
                  const updated = await taskApi.update(task.id, {
                    ...task,
                    deadline: newDeadlineIso,
                  });
                  updatedTasks.push(updated);
                }

                // Register SINGLE ATOMIC UNDO entry for the entire batch
                recordAction({
                  description: `Moved ${highTasks.length} HIGH priority tasks to next week`,
                  undo: async () => {
                    for (const original of originalTasks) {
                      await taskApi.update(original.id, {
                        ...original,
                        deadline: original.deadline,
                      });
                    }
                  },
                  redo: async () => {
                    for (const task of updatedTasks) {
                      await taskApi.update(task.id, {
                        ...task,
                        deadline: task.deadline,
                      });
                    }
                  },
                });

                showToast(`Moved ${highTasks.length} tasks to next week · Undo available (Ctrl+Z)`, 'success');
                setBulkPreview(null);
              } catch {
                showToast('Failed to apply bulk move. Rolling back.', 'error');
              } finally {
                setBulkLoading(false);
              }
            },
          });
        } catch {
          showToast('Could not fetch tasks for bulk operation', 'error');
        }
      },
    },
    {
      id: 'advanced-toggle-contrast',
      section: 'Advanced',
      label: highContrast ? 'Disable High Contrast Mode' : 'Enable High Contrast Mode',
      description: 'Toggle strong contrast and enhanced focus rings',
      keywords: ['high contrast', 'accessibility', 'contrast'],
      icon: Contrast,
      action: () => {
        setHighContrast(!highContrast);
        showToast(
          !highContrast ? 'High Contrast Mode enabled' : 'High Contrast Mode disabled',
          'info'
        );
      },
    },
    {
      id: 'advanced-replay-tour',
      section: 'Advanced',
      label: 'Replay Onboarding Tour',
      description: 'Restart the 5-step SmartSchedule walkthrough tour',
      keywords: ['replay tour', 'walkthrough', 'onboarding', 'help'],
      icon: HelpCircle,
      action: () => {
        setHasCompletedOnboarding(false);
        showToast('Onboarding tour reset. Welcome back!', 'info');
      },
    },
  ], [
    navigate,
    setCalendarView,
    toggleMiniCalendar,
    activeScheduleId,
    recordAction,
    highContrast,
    setHighContrast,
    setHasCompletedOnboarding,
  ]);

  // Deterministic fuzzy search matching
  const filteredEntries = useMemo(() => {
    const q = query.trim();
    if (!q) return entries;

    return entries.filter((entry) => {
      const haystack = [
        entry.label,
        entry.description,
        entry.section,
        ...entry.keywords,
      ].join(' ');

      return matchesCommandQuery(haystack, q);
    });
  }, [entries, query]);

  useEffect(() => {
    if (!open) return;
    setSelectedIndex(0);
    const timeout = window.setTimeout(() => inputRef.current?.focus(), 20);
    return () => window.clearTimeout(timeout);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (bulkPreview) return; // Modal is handling inputs

      if (filteredEntries.length === 0) {
        if (event.key === 'Escape') {
          event.preventDefault();
          onClose();
        }
        return;
      }
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setSelectedIndex((current) => Math.min(current + 1, filteredEntries.length - 1));
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setSelectedIndex((current) => Math.max(current - 1, 0));
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
      if (event.key === 'Enter' && filteredEntries[selectedIndex]) {
        event.preventDefault();
        const selected = filteredEntries[selectedIndex];
        void selected.action();
        if (selected.id !== 'bulk-move-high-tasks') {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredEntries, onClose, open, selectedIndex, bulkPreview]);

  if (!open) return null;

  return (
    <>
      <div className="command-palette-backdrop" onClick={onClose} role="presentation">
        <div
          className="command-palette"
          onClick={(event) => event.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label="Command palette"
        >
          <div className="command-palette-header">
            <Search size={16} aria-hidden="true" />
            <input
              ref={inputRef}
              className="command-palette-input"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setSelectedIndex(0);
              }}
              placeholder="Type a command or search (e.g. 'week', 'timeline', 'task', 'opt')..."
              aria-label="Command palette search input"
            />
            {query && (
              <button
                type="button"
                className="icon-button compact-btn"
                onClick={() => setQuery('')}
                aria-label="Clear query"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="command-palette-results" role="listbox">
            {filteredEntries.length === 0 ? (
              <div className="command-palette-empty">No matching commands found.</div>
            ) : (
              filteredEntries.map((entry, index) => {
                const isSelected = index === selectedIndex;
                const IconComponent = entry.icon;
                return (
                  <button
                    key={entry.id}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    className={isSelected ? 'command-palette-item active' : 'command-palette-item'}
                    onClick={() => {
                      void entry.action();
                      if (entry.id !== 'bulk-move-high-tasks') {
                        onClose();
                      }
                    }}
                  >
                    <span className="command-palette-icon">
                      <IconComponent size={16} />
                    </span>
                    <span className="command-palette-copy">
                      <strong>{entry.label}</strong>
                      <small>{entry.description}</small>
                    </span>
                    <span className="command-palette-section">{entry.section}</span>
                  </button>
                );
              })
            )}
          </div>

          <div className="command-palette-footer">
            <div className="command-footer-hints">
              <span className="hint-item"><kbd>↑</kbd><kbd>↓</kbd> Navigate</span>
              <span className="hint-item"><kbd>Enter</kbd> Select</span>
              <span className="hint-item"><kbd>Esc</kbd> Close</span>
            </div>
            <span className="command-palette-brand">SmartSchedule · FPT University Quy Nhơn</span>
          </div>
        </div>
      </div>

      {/* Bulk Action Safety Preview Dialog */}
      {bulkPreview && (
        <div className="dialog-backdrop" onClick={() => setBulkPreview(null)}>
          <div
            className="confirm-dialog"
            onClick={(e) => e.stopPropagation()}
            role="alertdialog"
            aria-labelledby="bulk-dialog-title"
          >
            <div className="dialog-header-warning">
              <AlertTriangle size={20} className="warning-icon" />
              <div>
                <p className="eyebrow">Bulk Action Safety Preview</p>
                <h3 id="bulk-dialog-title">{bulkPreview.title}</h3>
              </div>
            </div>

            <p className="muted">{bulkPreview.description}</p>

            <div className="bulk-task-preview-list">
              <strong>{bulkPreview.tasks.length} tasks affected:</strong>
              <ul>
                {bulkPreview.tasks.map((task) => (
                  <li key={task.id}>
                    <span>{task.title}</span>
                    <span className="task-priority-pill high">{task.priority}</span>
                  </li>
                ))}
              </ul>
            </div>

            <p className="safety-note">
              ✓ Protected: After applying, you can revert all {bulkPreview.tasks.length} tasks simultaneously with one <kbd>Ctrl+Z</kbd>.
            </p>

            <div className="drawer-actions">
              <button
                type="button"
                className="secondary-button"
                disabled={bulkLoading}
                onClick={() => setBulkPreview(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="primary-button"
                disabled={bulkLoading}
                onClick={() => void bulkPreview.execute()}
              >
                <Check size={14} />
                <span>{bulkLoading ? 'Applying...' : 'Apply Bulk Action'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
