import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CalendarDays, Clock, MapPin, Share2, Sparkles, Check, Copy } from 'lucide-react';
import { publicScheduleApi } from '../../services/publicScheduleApi';
import type { PublicSchedule } from '../../types/domain';

export function PublicSchedulePage() {
  const { token } = useParams();
  const [schedule, setSchedule] = useState<PublicSchedule | null>(null);
  const [error, setError] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (token) {
      void publicScheduleApi
        .get(token)
        .then(setSchedule)
        .catch(() => setError(true));
    }
  }, [token]);

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Group events by Day of the week
  const groupedByDay = useMemo(() => {
    if (!schedule?.events) return [];
    const map = new Map<string, { date: Date; dateLabel: string; dayLabel: string; items: typeof schedule.events }>();

    for (const event of schedule.events) {
      const d = new Date(event.startsAt);
      const key = d.toISOString().slice(0, 10);
      if (!map.has(key)) {
        map.set(key, {
          date: d,
          dateLabel: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
          dayLabel: d.toLocaleDateString(undefined, { weekday: 'long' }),
          items: [],
        });
      }
      map.get(key)!.items.push(event);
    }

    // Sort by date, then sort items by startsAt
    const days = Array.from(map.values()).sort((a, b) => a.date.getTime() - b.date.getTime());
    for (const day of days) {
      day.items.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
    }
    return days;
  }, [schedule]);

  if (error) {
    return (
      <main className="public-page">
        <div className="panel empty-state">
          <strong>Shared schedule not found</strong>
          <span>This link may be expired, revoked, or invalid.</span>
          <Link to="/dashboard" className="primary-button" style={{ marginTop: '16px' }}>Back to workspace</Link>
        </div>
      </main>
    );
  }

  if (!schedule) {
    return (
      <main className="public-page">
        <div className="panel empty-state">
          <span>Loading shared weekly timetable...</span>
        </div>
      </main>
    );
  }

  return (
    <main className="public-page">
      <header className="public-header">
        <div className="public-header-content">
          <div className="brand" style={{ marginBottom: '14px' }}>
            <span className="brand-mark">S</span>
            <span>SmartSchedule</span>
          </div>
          <p className="eyebrow">Public Timetable · View only</p>
          <h1>{schedule.name}</h1>
          <p className="muted">
            Published weekly schedule · Times shown in {schedule.timezone}
          </p>
        </div>
        <div className="public-header-actions">
          <button className="secondary-button" onClick={copyUrl}>
            {copied ? <><Check size={14} /> Link copied</> : <><Copy size={14} /> Copy link</>}
          </button>
          <Link to="/dashboard" className="primary-button" style={{ textDecoration: 'none' }}>
            Open workspace →
          </Link>
        </div>
      </header>

      <div className="public-content">
        {groupedByDay.length === 0 ? (
          <div className="panel empty-state compact">
            <span>No commitments scheduled for this week.</span>
          </div>
        ) : (
          <div className="public-days-list">
            {groupedByDay.map((day) => (
              <section key={day.dateLabel} className="panel public-day-card">
                <div className="public-day-header">
                  <div>
                    <strong>{day.dayLabel}</strong>
                    <span className="muted">{day.dateLabel}</span>
                  </div>
                  <span className="status-pill info">{day.items.length} session{day.items.length === 1 ? '' : 's'}</span>
                </div>

                <div className="public-events-list">
                  {day.items.map((event, idx) => {
                    const start = new Date(event.startsAt);
                    const end = new Date(event.endsAt);
                    const timeStr = `${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
                    const durationMin = Math.round((end.getTime() - start.getTime()) / 60000);

                    return (
                      <div className="public-event-row" key={`${event.title}-${event.startsAt}-${idx}`}>
                        <div className="public-event-time">
                          <Clock size={14} className="muted" />
                          <span>{timeStr}</span>
                          <small className="muted">({durationMin}m)</small>
                        </div>
                        <div className="public-event-body">
                          <span className="public-event-indicator" style={{ background: event.color || '#2563eb' }} />
                          <div>
                            <strong>{event.title}</strong>
                            {event.location && (
                              <span className="public-event-location">
                                <MapPin size={12} /> {event.location}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      <footer className="public-footer">
        <p className="muted">
          Shared with <Sparkles size={13} style={{ display: 'inline', verticalAlign: 'middle' }} /> SmartSchedule. Private notes and security metadata are hidden.
        </p>
      </footer>
    </main>
  );
}
