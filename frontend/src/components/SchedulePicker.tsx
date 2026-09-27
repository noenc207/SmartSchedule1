import { useEffect, useState } from 'react';
import { scheduleApi } from '../services/scheduleApi';
import { useWorkspaceStore } from '../stores/workspaceStore';
import type { ScheduleSummary } from '../types/domain';

export function SchedulePicker({ onChange }: { onChange?: (schedule: ScheduleSummary | null) => void }) {
  const [schedules, setSchedules] = useState<ScheduleSummary[]>([]);
  const { activeScheduleId, setActiveScheduleId, setActiveRole } = useWorkspaceStore();
  useEffect(() => { scheduleApi.list().then((items) => { setSchedules(items); if (!activeScheduleId && items[0]) setActiveScheduleId(items[0].id); }); }, [activeScheduleId, setActiveScheduleId]);
  const active = schedules.find((item) => item.id === activeScheduleId) ?? null;
  useEffect(() => { onChange?.(active); setActiveRole(active?.role ?? (active?.owned ? 'OWNER' : null)); }, [active, onChange, setActiveRole]);
  const owned = schedules.filter((schedule) => schedule.owned || schedule.role === 'OWNER');
  const shared = schedules.filter((schedule) => !schedule.owned && schedule.role !== 'OWNER');
  return <label className="schedule-picker"><span>Workspace</span><select value={activeScheduleId ?? ''} onChange={(e) => setActiveScheduleId(e.target.value || null)}><option value="">Select schedule</option>{owned.length > 0 && <optgroup label="My schedules">{owned.map((schedule) => <option key={schedule.id} value={schedule.id}>{schedule.name}</option>)}</optgroup>}{shared.length > 0 && <optgroup label="Shared with me">{shared.map((schedule) => <option key={schedule.id} value={schedule.id}>{schedule.name}</option>)}</optgroup>}</select></label>;
}
