import { useEffect, useState } from 'react';
import { SchedulePicker } from '../../components/SchedulePicker';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { reschedulingApi } from '../../services/reschedulingApi';
import { showToast } from '../../components/Toast';
import type { RescheduleAlternative, RescheduleChangeType, RescheduleImpact, RescheduleResult, ReschedulingRequest, WhatIfResult } from '../../types/domain';

const initialRequest = (): ReschedulingRequest => {
  const from = new Date(); from.setHours(0, 0, 0, 0);
  const to = new Date(from); to.setDate(to.getDate() + 7);
  return { changeType: 'EVENT_ADDED', from: from.toISOString(), to: to.toISOString() };
};

export function ReschedulingPage() {
  const scheduleId = useWorkspaceStore((state) => state.activeScheduleId);
  const [request, setRequest] = useState<ReschedulingRequest>(initialRequest);
  const [impact, setImpact] = useState<RescheduleImpact | null>(null);
  const [result, setResult] = useState<RescheduleResult | null>(null);
  const [simulation, setSimulation] = useState<WhatIfResult | null>(null);
  const [selected, setSelected] = useState<RescheduleAlternative | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => { setImpact(null); setResult(null); setSimulation(null); setSelected(null); }, [scheduleId]);
  const update = (key: keyof ReschedulingRequest, value: string) => setRequest((current) => ({ ...current, [key]: value }));
  const analyze = async () => {
    if (!scheduleId) return;
    setLoading(true); setError(''); setMessage('');
    try { setImpact(await reschedulingApi.analyze(scheduleId, request)); } catch { setError('Could not analyze schedule impact.'); } finally { setLoading(false); }
  };
  const generate = async () => {
    if (!scheduleId) return;
    setLoading(true); setError(''); setMessage('');
    try { setResult(await reschedulingApi.generate(scheduleId, request)); } catch { setError('Could not generate rescheduling alternatives.'); } finally { setLoading(false); }
  };
  const simulate = async () => {
    if (!scheduleId) return;
    setLoading(true); setError(''); setMessage('');
    try { setSimulation(await reschedulingApi.whatIf(scheduleId, request)); } catch { setError('Could not simulate this change.'); } finally { setLoading(false); }
  };
  const apply = async () => {
    if (!scheduleId || !selected) return;
    setLoading(true); setError(''); setMessage('');
    try {
      await reschedulingApi.apply(scheduleId, selected);
      setMessage('Reschedule applied. Unaffected sessions were preserved.');
      showToast('Reschedule applied. Unaffected sessions preserved.', 'success');
    } catch (reason: any) { setError(reason?.response?.status === 409 ? 'Schedule changed since this plan was generated. Generate alternatives again.' : 'Could not apply the selected alternative.'); } finally { setLoading(false); }
  };
  return <section className="workspace-page">
    <div className="section-heading"><div><p className="eyebrow">Change-aware planning</p><h2>Reschedule center</h2></div><SchedulePicker /></div>
    {error && <div className="form-error" role="alert">{error}</div>}{message && <div className="form-success" role="status">{message}</div>}
    {simulation && <div className="what-if-banner"><span><strong>WHAT-IF MODE</strong> Changes are temporary until applied.</span><button className="text-button" onClick={() => setSimulation(null)}>Exit simulation</button></div>}
    {!scheduleId ? <div className="panel empty-state"><strong>Select a schedule first</strong><span>Impact analysis uses the active workspace snapshot.</span></div> : <div className="rescheduling-layout">
      <section className="panel form-panel"><h3>Change to analyze</h3><label className="field"><span>Change type</span><select value={request.changeType} onChange={(e) => update('changeType', e.target.value as RescheduleChangeType)}><option value="EVENT_ADDED">Event added</option><option value="EVENT_MOVED">Event moved</option><option value="EVENT_RESIZED">Event resized</option><option value="EVENT_CANCELLED">Event cancelled</option><option value="AVAILABILITY_CHANGED">Availability changed</option><option value="TASK_DEADLINE_CHANGED">Task deadline changed</option><option value="TASK_DURATION_CHANGED">Task duration changed</option><option value="TASK_CANCELLED">Task cancelled</option></select></label><label className="field"><span>Event or task ID (optional)</span><input value={request.eventId ?? request.taskId ?? ''} onChange={(e) => update('eventId', e.target.value)} placeholder="UUID" /></label><label className="field"><span>Change starts</span><input type="datetime-local" value={request.from.slice(0, 16)} onChange={(e) => update('from', new Date(e.target.value).toISOString())} /></label><label className="field"><span>Change ends</span><input type="datetime-local" value={request.to.slice(0, 16)} onChange={(e) => update('to', new Date(e.target.value).toISOString())} /></label><div className="drawer-actions"><button className="secondary-button" onClick={() => void analyze()} disabled={loading}>Analyze impact</button><button className="primary-button" onClick={() => void generate()} disabled={loading}>Review alternatives</button><button className="secondary-button" onClick={() => void simulate()} disabled={loading}>What if?</button></div></section>
      <section className="panel"><h3>Impact summary</h3>{impact ? <ImpactSummary impact={impact} /> : <div className="empty-state compact"><span>Analyze a change to see affected and preserved sessions.</span></div>}{simulation && <WhatIfPanel simulation={simulation} />}{result && <AlternativePlans result={result} selected={selected} onSelect={setSelected} onApply={() => void apply()} loading={loading} />}</section>
    </div>}
  </section>;
}

function ImpactSummary({ impact }: { impact: RescheduleImpact }) { return <div className="impact-summary"><div className="plan-summary"><span><strong>{impact.affectedSessions.length}</strong> affected</span><span><strong>{impact.unaffectedSessions.length}</strong> preserved</span><span><strong>{impact.lostCapacityMinutes}m</strong> capacity lost</span></div><p className="muted">{impact.impactSummary}</p><div className="resource-list">{impact.affectedTasks.map((item) => <div className="resource-row affected-row" key={`task-${item.id}`}><div><strong>{item.title}</strong><span>{item.classification.replaceAll('_', ' ')} · {item.minutes}m remaining</span></div><span className="status-pill warning">Task</span></div>)}{impact.affectedSessions.map((item) => <div className="resource-row affected-row" key={item.id}><div><strong>{item.title}</strong><span>{item.classification.replaceAll('_', ' ')} · {item.startsAt ? new Date(item.startsAt).toLocaleString() : 'No start time'} · {item.minutes}m</span></div><span className="status-pill warning">Review</span></div>)}</div></div>; }
function AlternativePlans({ result, selected, onSelect, onApply, loading }: { result: RescheduleResult; selected: RescheduleAlternative | null; onSelect: (alternative: RescheduleAlternative) => void; onApply: () => void; loading: boolean }) { return <div className="alternatives"><div className="panel-heading"><div><p className="eyebrow">Review before applying</p><h3>Candidate slots</h3></div><span className="muted">{result.alternatives.length} options</span></div>{result.alternatives.map((alternative, index) => <button className={selected?.id === alternative.id ? 'alternative-card selected' : 'alternative-card'} key={alternative.id} onClick={() => onSelect(alternative)}><div><strong>Option {String.fromCharCode(65 + index)}</strong><span>{alternative.reasonCodes.join(' · ')}</span>{alternative.slots.slice(0, 2).map((slot) => <small className="alternative-slot" key={`${slot.taskId}-${slot.startsAt}`}>✓ {slot.title} · {new Date(slot.startsAt).toLocaleString()}–{new Date(slot.endsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small>)}</div><div className="alternative-metrics"><span>{alternative.movedSessions} moved</span><span>{alternative.changeCost} change cost</span><span>{alternative.deadlineMarginMinutes}m deadline margin</span></div></button>)}{selected && <button className="primary-button" onClick={onApply} disabled={loading}>{loading ? 'Applying...' : 'Apply selected alternative'}</button>}</div>; }
function WhatIfPanel({ simulation }: { simulation: WhatIfResult }) { return <div className="what-if-panel"><h3>What-if preview</h3><p className="muted">This simulation has not changed your calendar.</p><div className="plan-summary"><span><strong>{simulation.current.affectedSessions.length}</strong> current impact</span><span><strong>{simulation.simulated.affectedSessions.length}</strong> simulated impact</span><span><strong>{simulation.simulated.lostCapacityMinutes}m</strong> capacity lost</span></div></div>; }
