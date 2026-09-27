import { useEffect, useState } from 'react';
import { SchedulePicker } from '../../components/SchedulePicker';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { collaborationApi } from '../../services/collaborationApi';
import type { ActivityItem, MemberRole, ScheduleMember, ShareLink, TeamAvailabilityResponse } from '../../types/domain';

export function CollaborationPage() {
  const scheduleId = useWorkspaceStore((state) => state.activeScheduleId);
  const role = useWorkspaceStore((state) => state.activeRole);
  const [members, setMembers] = useState<ScheduleMember[]>([]);
  const [links, setLinks] = useState<ShareLink[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [team, setTeam] = useState<TeamAvailabilityResponse | null>(null);
  const [email, setEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'EDITOR' | 'VIEWER'>('EDITOR');
  const [error, setError] = useState('');
  const canManage = role === 'OWNER';
  const canViewTeam = role === 'OWNER' || role === 'EDITOR';

  const load = async () => {
    if (!scheduleId) return;
    try {
      const [memberData, linkData, activityData] = await Promise.all([
        collaborationApi.members(scheduleId),
        canManage ? collaborationApi.shareLinks(scheduleId) : Promise.resolve([]),
        collaborationApi.activity(scheduleId),
      ]);
      setMembers(memberData); setLinks(linkData); setActivity(activityData);
      if (canViewTeam) {
        const from = new Date(); from.setHours(0, 0, 0, 0);
        const to = new Date(from); to.setDate(to.getDate() + 7);
        setTeam(await collaborationApi.teamAvailability(scheduleId, from.toISOString(), to.toISOString()));
      }
    } catch { setError('Could not load collaboration data.'); }
  };
  useEffect(() => { setError(''); setMembers([]); setLinks([]); setActivity([]); setTeam(null); void load(); }, [scheduleId, role]);
  const invite = async (event: React.FormEvent) => {
    event.preventDefault(); if (!scheduleId || !email.trim()) return;
    try { const member = await collaborationApi.invite(scheduleId, email.trim(), inviteRole); setMembers((current) => [...current, member]); setEmail(''); } catch { setError('Could not invite this account.'); }
  };
  const changeRole = async (member: ScheduleMember, nextRole: 'EDITOR' | 'VIEWER') => {
    if (!scheduleId) return;
    try { const updated = await collaborationApi.updateRole(scheduleId, member.userId, nextRole); setMembers((current) => current.map((item) => item.userId === member.userId ? updated : item)); } catch { setError('Could not change member role.'); }
  };
  const remove = async (member: ScheduleMember) => {
    if (!scheduleId) return;
    try { await collaborationApi.remove(scheduleId, member.userId); setMembers((current) => current.filter((item) => item.userId !== member.userId)); } catch { setError('Could not remove member.'); }
  };
  const createLink = async () => { if (!scheduleId) return; try { const link = await collaborationApi.createShareLink(scheduleId); setLinks((current) => [link, ...current]); } catch { setError('Could not create share link.'); } };
  const revoke = async (link: ShareLink) => { if (!scheduleId) return; try { await collaborationApi.revokeShareLink(scheduleId, link.id); setLinks((current) => current.map((item) => item.id === link.id ? { ...item, revokedAt: new Date().toISOString() } : item)); } catch { setError('Could not revoke share link.'); } };
  return <section className="workspace-page"><div className="section-heading"><div><p className="eyebrow">Shared workspace</p><h2>Collaboration</h2></div><SchedulePicker /></div>{error && <div className="form-error" role="alert">{error}</div>}{!scheduleId ? <div className="panel empty-state"><strong>Select a schedule first</strong><span>Members, availability, sharing, and activity belong to a workspace.</span></div> : <div className="collaboration-grid"><section className="panel"><div className="panel-heading"><h3>Members</h3><span className="muted">{members.length} members</span></div>{canManage && <form className="inline-form" onSubmit={invite}><input type="email" placeholder="member@example.com" value={email} onChange={(event) => setEmail(event.target.value)} required /><select value={inviteRole} onChange={(event) => setInviteRole(event.target.value as 'EDITOR' | 'VIEWER')}><option value="EDITOR">Editor</option><option value="VIEWER">Viewer</option></select><button className="primary-button">Invite</button></form>}<div className="resource-list">{members.map((member) => <div className="resource-row" key={member.userId}><div><strong>{member.displayName}</strong><span>{member.email} · {member.role}</span></div>{canManage && member.role !== 'OWNER' && <div><select aria-label={`Role for ${member.displayName}`} value={member.role} onChange={(event) => void changeRole(member, event.target.value as 'EDITOR' | 'VIEWER')}><option>EDITOR</option><option>VIEWER</option></select><button className="icon-button danger" onClick={() => void remove(member)}>Remove</button></div>}</div>)}</div></section><section className="panel"><div className="panel-heading"><h3>Team availability</h3><span className="muted">This week</span></div>{!canViewTeam ? <div className="empty-state compact"><span>Team availability is available to editors and owners.</span></div> : !team ? <div className="empty-state compact"><span>Loading common availability...</span></div> : team.slots.length === 0 ? <div className="empty-state compact"><span>No common availability found.</span></div> : <div className="resource-list">{team.slots.map((slot) => <div className="resource-row" key={`${slot.start}-${slot.end}`}><div><strong>{new Date(slot.start).toLocaleString()} – {new Date(slot.end).toLocaleTimeString()}</strong><span>{slot.availableMembers}/{slot.totalMembers} members available</span></div><span className="status-pill info">Shared</span></div>)}</div>}</section>{canManage && <section className="panel"><div className="panel-heading"><h3>Public share links</h3><button className="primary-button" onClick={() => void createLink()}>Create link</button></div>{links.length === 0 ? <div className="empty-state compact"><span>No active links.</span></div> : <div className="resource-list">{links.map((link) => <div className="resource-row" key={link.id}><div><strong>View only</strong><span>{link.expiresAt ? `Expires ${new Date(link.expiresAt).toLocaleString()}` : 'Never expires'}{link.revokedAt ? ' · Revoked' : ''}</span></div>{!link.revokedAt && <><button className="icon-button" onClick={() => link.url && void navigator.clipboard?.writeText(link.url)}>Copy</button><button className="icon-button danger" onClick={() => void revoke(link)}>Revoke</button></>}</div>)}</div>}</section>}<section className="panel"><div className="panel-heading"><h3>Recent activity</h3></div>{activity.length === 0 ? <div className="empty-state compact"><span>No recent activity.</span></div> : <div className="resource-list">{activity.slice(0, 10).map((item) => <div className="resource-row" key={item.id}><div><strong>{item.action.replaceAll('_', ' ')}</strong><span>{item.actorName ?? 'A member'} · {new Date(item.createdAt).toLocaleString()}</span></div></div>)}</div>}</section></div>}</section>;
}
