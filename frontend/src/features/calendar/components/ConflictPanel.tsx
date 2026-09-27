import { useEffect, useState } from 'react';
import { conflictApi } from '../../../services/conflictApi';
import { useWorkspaceStore } from '../../../stores/workspaceStore';
import type { ConflictAnalysis, ConflictSeverity } from '../../../types/domain';

function weekRange() {
  const end = new Date();
  end.setDate(end.getDate() + 7);
  return { from: new Date().toISOString(), to: end.toISOString() };
}

const severityLabel: Record<ConflictSeverity, string> = { ERROR: 'Error', WARNING: 'Warning', INFO: 'Info' };

export function ConflictPanel() {
  const activeScheduleId = useWorkspaceStore((state) => state.activeScheduleId);
  const [analysis, setAnalysis] = useState<ConflictAnalysis | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!activeScheduleId) { setAnalysis(null); return; }
    const range = weekRange();
    setError('');
    void conflictApi.analyze(activeScheduleId, range.from, range.to)
      .then(setAnalysis)
      .catch(() => setError('Could not load conflict analysis.'));
  }, [activeScheduleId]);
  if (!activeScheduleId) return null;
  if (error) return <section className="panel"><div className="form-error">{error}</div></section>;
  if (!analysis) return <section className="panel"><div className="empty-state compact"><span>Checking this week for conflicts...</span></div></section>;
  const conflicts = Array.isArray(analysis.conflicts) ? analysis.conflicts : [];
  return <section className="panel">
    <div className="panel-heading"><h3>Conflict analysis</h3><span className="muted">{conflicts.length} finding{conflicts.length === 1 ? '' : 's'}</span></div>
    {conflicts.length === 0 ? <div className="empty-state compact"><strong>Schedule looks clear</strong><span>No event, availability, deadline, or workload conflicts were found.</span></div> : <div className="resource-list">{conflicts.map((finding, index) => <div className="resource-row" key={`${finding.type}-${finding.relatedId ?? 'day'}-${index}`}><div><strong>{finding.title}</strong><span>{severityLabel[finding.severity] ?? 'Notice'} · {finding.description}</span></div><span className={`status-pill ${(finding.severity ?? 'INFO').toLowerCase()}`}>{finding.minutes} min</span></div>)}</div>}
  </section>;
}
