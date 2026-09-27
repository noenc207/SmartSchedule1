import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { notificationApi, type NotificationItem } from '../../services/notificationApi';

function target(item: NotificationItem): string {
  if (item.type === 'EVENT_REMINDER' && item.relatedEntityId) return `/calendar?event=${item.relatedEntityId}`;
  if (item.type === 'DEADLINE_REMINDER' && item.relatedEntityId) return `/tasks?task=${item.relatedEntityId}`;
  if (item.type === 'CONFLICT_ALERT') return '/dashboard';
  if (item.type === 'RESCHEDULE_REQUIRED') return '/rescheduling';
  return '/notifications';
}

export function NotificationsPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      setItems((await notificationApi.list(unreadOnly)).content);
    } catch {
      setError('Notifications could not be loaded.');
    }
  };
  useEffect(() => { void load(); }, [unreadOnly]);

  const read = async (item: NotificationItem) => {
    if (!item.readAt) {
      await notificationApi.markRead(item.id);
      setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, readAt: new Date().toISOString() } : entry));
    }
    navigate(target(item));
  };

  return <section className="workspace-page">
    <div className="section-heading">
      <div><p className="eyebrow">Inbox</p><h2>Notifications</h2></div>
      <div className="inline-form">
        <button className={unreadOnly ? 'secondary-button' : 'primary-button'} onClick={() => setUnreadOnly(false)}>All</button>
        <button className={unreadOnly ? 'primary-button' : 'secondary-button'} onClick={() => setUnreadOnly(true)}>Unread</button>
        <button className="secondary-button" onClick={async () => { await notificationApi.markAllRead(); await load(); }}>Mark all read</button>
      </div>
    </div>
    {error && <div className="form-error" role="alert">{error}</div>}
    <section className="panel">
      {items.length === 0 ? <div className="empty-state"><strong>You are all caught up.</strong><span>No notifications require attention.</span></div> :
        <div className="resource-list">{items.map((item) =>
          <button className={`resource-row notification-row ${item.readAt ? '' : 'unread'}`} key={item.id} onClick={() => void read(item)}>
            <div><strong>{item.title}</strong><span>{item.message}</span></div>
            <time>{new Date(item.createdAt).toLocaleString()}</time>
          </button>)}</div>}
    </section>
  </section>;
}
