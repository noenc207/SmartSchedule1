import React from 'react';
import type { Task, EventItem } from '../../../types/domain';
import {
  getTaskRemainingMinutes,
  getTaskSchedulingState,
  formatMinutes,
} from '../utils/taskCalculations';
import type {
  TaskFilterDeadline,
  TaskFilterPriority,
  TaskFilterStatus,
  TaskSortOption,
} from '../../../stores/preferenceStore';

export type TaskFilter = TaskFilterStatus;

interface TaskWorkspaceHeaderProps {
  tasks: Task[];
  filteredCount: number;
  events: EventItem[];
  selectedIds: string[];
  currentFilter: TaskFilterStatus;
  currentPriority: TaskFilterPriority;
  currentDeadline: TaskFilterDeadline;
  currentSort: TaskSortOption;
  searchQuery: string;
  isComposerOpen: boolean;
  onToggleComposer: () => void;
  onFilterChange: (filter: TaskFilterStatus) => void;
  onPriorityChange: (priority: TaskFilterPriority) => void;
  onDeadlineChange: (deadline: TaskFilterDeadline) => void;
  onSortChange: (sort: TaskSortOption) => void;
  onSearchChange: (query: string) => void;
  onClearFilters: () => void;
  onToggleSelectAll: () => void;
}

export function TaskWorkspaceHeader({
  tasks,
  filteredCount,
  events,
  selectedIds,
  currentFilter,
  currentPriority,
  currentDeadline,
  currentSort,
  searchQuery,
  isComposerOpen,
  onToggleComposer,
  onFilterChange,
  onPriorityChange,
  onDeadlineChange,
  onSortChange,
  onSearchChange,
  onClearFilters,
  onToggleSelectAll,
}: TaskWorkspaceHeaderProps) {
  const allSelected = tasks.length > 0 && selectedIds.length === tasks.length;
  const selectedTasks = tasks.filter((t) => selectedIds.includes(t.id));

  // Compute filter counts
  const countSelected = selectedTasks.length;
  const countUnscheduled = tasks.filter((t) => getTaskSchedulingState(t, events) === 'UNSCHEDULED').length;
  const countScheduled = tasks.filter((t) => getTaskSchedulingState(t, events) === 'SCHEDULED').length;

  // Selected Summary metrics
  const totalRemainingMinutes = selectedTasks.reduce(
    (sum, t) => sum + getTaskRemainingMinutes(t, events),
    0
  );
  const highPriorityCount = selectedTasks.filter((t) => t.priority === 'HIGH').length;
  const approachingDeadlineCount = selectedTasks.filter((t) => {
    if (!t.deadline) return false;
    const diff = Math.ceil((new Date(t.deadline).getTime() - Date.now()) / 86400000);
    return diff >= 0 && diff <= 3;
  }).length;

  const hasActiveSecondaryFilters =
    searchQuery.trim().length > 0 ||
    currentPriority !== 'ALL' ||
    currentDeadline !== 'ALL' ||
    currentFilter !== 'ALL';

  return (
    <div className="task-workspace-header-container">
      <div className="task-workspace-title-row">
        <div>
          <p className="eyebrow">STEP 1</p>
          <h3 className="task-workspace-title">Tác vụ cần xếp lịch</h3>
        </div>
        <div className="task-workspace-header-actions">
          <button
            type="button"
            className="primary-button compact-btn fpt-add-task-btn"
            onClick={onToggleComposer}
            aria-label="Thêm tác vụ"
          >
            <span>{isComposerOpen ? 'Đóng' : '+ Thêm tác vụ'}</span>
          </button>
          <button
            type="button"
            className="text-button compact-btn select-all-btn"
            onClick={onToggleSelectAll}
            disabled={tasks.length === 0}
          >
            {allSelected ? 'Bỏ chọn hết' : 'Chọn tất cả'}
            {tasks.length > 0 && (
              <span className="selection-count-pill">
                {selectedIds.length} / {tasks.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Instant Search and Multi-Filter Controls */}
      <div className="task-search-filter-bar">
        <div className="task-search-box">
          <input
            type="text"
            className="task-search-input"
            placeholder="Tìm tác vụ theo tên, môn học, độ ưu tiên..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="task-search-clear-btn"
              onClick={() => onSearchChange('')}
              aria-label="Xóa tìm kiếm"
            >
              [Xóa]
            </button>
          )}
        </div>

        <div className="task-filter-dropdowns">
          <div className="task-dropdown-field">
            <select
              className="task-filter-select"
              value={currentPriority}
              onChange={(e) => onPriorityChange(e.target.value as TaskFilterPriority)}
              aria-label="Lọc theo độ ưu tiên"
            >
              <option value="ALL">Mọi ưu tiên</option>
              <option value="HIGH">Ưu tiên cao</option>
              <option value="MEDIUM">Ưu tiên vừa</option>
              <option value="LOW">Ưu tiên thấp</option>
            </select>
          </div>

          <div className="task-dropdown-field">
            <select
              className="task-filter-select"
              value={currentDeadline}
              onChange={(e) => onDeadlineChange(e.target.value as TaskFilterDeadline)}
              aria-label="Lọc theo hạn nộp"
            >
              <option value="ALL">Mọi hạn chót</option>
              <option value="TODAY">Hạn hôm nay</option>
              <option value="TOMORROW">Hạn ngày mai</option>
              <option value="3DAYS">Hạn trong 3 ngày</option>
              <option value="7DAYS">Hạn trong 7 ngày</option>
              <option value="OVERDUE">Đã quá hạn</option>
            </select>
          </div>

          <div className="task-dropdown-field">
            <select
              className="task-filter-select"
              value={currentSort}
              onChange={(e) => onSortChange(e.target.value as TaskSortOption)}
              aria-label="Sắp xếp tác vụ"
            >
              <option value="DEADLINE">Xếp: Hạn nộp</option>
              <option value="PRIORITY">Xếp: Ưu tiên</option>
              <option value="DURATION_DESC">Xếp: Dài nhất</option>
              <option value="DURATION_ASC">Xếp: Ngắn nhất</option>
              <option value="TITLE">Xếp: Tên A-Z</option>
            </select>
          </div>

          {hasActiveSecondaryFilters && (
            <button
              type="button"
              className="text-button compact-btn clear-filters-btn"
              onClick={onClearFilters}
              title="Reset all filters"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Toolbar with Filter Tabs and Dynamic Task Count */}
      <div className="task-workspace-toolbar">
        <div className="task-filter-group" role="tablist" aria-label="Filter tasks">
          <button
            type="button"
            className={`task-filter-tab ${currentFilter === 'ALL' ? 'active' : ''}`}
            onClick={() => onFilterChange('ALL')}
            role="tab"
            aria-selected={currentFilter === 'ALL'}
          >
            All <span className="tab-badge">{tasks.length}</span>
          </button>
          <button
            type="button"
            className={`task-filter-tab ${currentFilter === 'SELECTED' ? 'active' : ''}`}
            onClick={() => onFilterChange('SELECTED')}
            role="tab"
            aria-selected={currentFilter === 'SELECTED'}
          >
            Selected <span className="tab-badge">{countSelected}</span>
          </button>
          <button
            type="button"
            className={`task-filter-tab ${currentFilter === 'UNSCHEDULED' ? 'active' : ''}`}
            onClick={() => onFilterChange('UNSCHEDULED')}
            role="tab"
            aria-selected={currentFilter === 'UNSCHEDULED'}
          >
            Unscheduled <span className="tab-badge">{countUnscheduled}</span>
          </button>
          <button
            type="button"
            className={`task-filter-tab ${currentFilter === 'SCHEDULED' ? 'active' : ''}`}
            onClick={() => onFilterChange('SCHEDULED')}
            role="tab"
            aria-selected={currentFilter === 'SCHEDULED'}
          >
            Scheduled <span className="tab-badge">{countScheduled}</span>
          </button>
        </div>

        <div className="task-count-status-label">
          <span>
            Showing <b>{filteredCount}</b> of <b>{tasks.length}</b> tasks
            {selectedIds.length > 0 ? ` · ${selectedIds.length} selected` : ''}
          </span>
        </div>
      </div>

      {/* Selected Summary when tasks are selected */}
      {selectedIds.length > 0 && (
        <div className="task-selection-summary">
          <span>
            <b>{selectedIds.length}</b> tasks selected · <b>{formatMinutes(totalRemainingMinutes)}</b> remaining work
          </span>
          {highPriorityCount > 0 && (
            <span className="summary-badge high-badge">
              {highPriorityCount} high priority
            </span>
          )}
          {approachingDeadlineCount > 0 && (
            <span className="summary-badge deadline-badge">
              {approachingDeadlineCount} deadline approaching
            </span>
          )}
        </div>
      )}
    </div>
  );
}
