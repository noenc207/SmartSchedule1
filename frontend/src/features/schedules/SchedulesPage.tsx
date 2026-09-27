import { useEffect, useState } from 'react';
import { scheduleApi } from '../../services/scheduleApi';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import type { ScheduleSummary } from '../../types/domain';

export function SchedulesPage() {
  const [items, setItems] = useState<ScheduleSummary[]>([]);
  const [name, setName] = useState('');
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const { activeScheduleId, setActiveScheduleId } = useWorkspaceStore();
  const load = () => scheduleApi.list().then((data) => { setItems(data); if (!activeScheduleId && data[0]) setActiveScheduleId(data[0].id); }).catch(() => setError('Could not load schedules.'));
  useEffect(() => { void load(); }, []);
  const create = async (event: React.FormEvent) => { event.preventDefault(); if (!name.trim()) return; try { if (editingId) { const item = await scheduleApi.update(editingId, { name, timezone, visibility: 'PRIVATE' }); setItems((old) => old.map((current) => current.id === editingId ? item : current)); setEditingId(null); } else { const item = await scheduleApi.create({ name, timezone, visibility: 'PRIVATE' }); setItems((old) => [item, ...old]); setActiveScheduleId(item.id); } setName(''); } catch { setError('Could not save schedule.'); } };
  const remove = async (id: string) => { if (!window.confirm('Delete this schedule and its data?')) return; try { await scheduleApi.remove(id); setItems((old) => old.filter((item) => item.id !== id)); if (activeScheduleId === id) setActiveScheduleId(null); } catch { setError('Could not delete schedule.'); } };
  return <section className="workspace-page"><div className="section-heading"><div><p className="eyebrow">Planning workspaces</p><h2>Schedules</h2></div></div>{error && <div className="form-error">{error}</div>}<div className="two-column"><form className="panel form-panel" onSubmit={create}><h3>{editingId ? 'Edit schedule' : 'Create a schedule'}</h3><label className="field"><span>Name</span><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Personal planning" /></label><label className="field"><span>Timezone</span><input value={timezone} onChange={(e) => setTimezone(e.target.value)} /></label><div className="topbar-actions"><button className="primary-button">{editingId ? 'Save changes' : 'Create schedule'}</button>{editingId && <button type="button" className="secondary-button" onClick={() => { setEditingId(null); setName(''); }}>Cancel</button>}</div></form><div className="panel"><div className="panel-heading"><h3>Your schedules</h3><span className="muted">{items.length} total</span></div>{items.length === 0 ? <div className="empty-state compact"><span>Create your first planning workspace.</span></div> : <div className="resource-list">{items.map((item) => <div className={item.id === activeScheduleId ? 'resource-row selected' : 'resource-row'} key={item.id}><button onClick={() => setActiveScheduleId(item.id)}><strong>{item.name}</strong><span>{item.timezone} · {item.visibility}</span></button><div><button className="icon-button" onClick={() => { setEditingId(item.id); setName(item.name); setTimezone(item.timezone); }}>Edit</button><button className="icon-button danger" onClick={() => void remove(item.id)} aria-label={`Delete ${item.name}`}>Delete</button></div></div>)}</div>}</div></div></section>;
}
