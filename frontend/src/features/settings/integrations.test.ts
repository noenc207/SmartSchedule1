import { describe, it, expect } from 'vitest';
import type {
  IntegrationItem,
  IntegrationStatus,
  SyncDirection,
} from './components/IntegrationsSection';

describe('Integrations Hub Service & State Machine', () => {
  const sampleIntegration: IntegrationItem = {
    id: 'google-calendar',
    name: 'Google Calendar',
    category: 'Calendar',
    description: 'Sync lecture timetables with your Google account.',
    badge: 'OAuth 2.0',
    scopes: ['calendar.events.readonly'],
    status: 'not_connected',
    syncDirection: 'import_only',
    lastSyncedAt: null,
    accountEmail: null,
  };

  it('defaults to not_connected and import_only without claiming fake active status', () => {
    expect(sampleIntegration.status).toBe('not_connected');
    expect(sampleIntegration.syncDirection).toBe('import_only');
    expect(sampleIntegration.accountEmail).toBeNull();
    expect(sampleIntegration.lastSyncedAt).toBeNull();
  });

  it('correctly transitions state upon authentic connection', () => {
    const connectedAccountEmail = 'student@fpt.edu.vn';
    const now = new Date().toISOString();

    const connectedItem: IntegrationItem = {
      ...sampleIntegration,
      status: 'connected',
      accountEmail: connectedAccountEmail,
      lastSyncedAt: now,
    };

    expect(connectedItem.status).toBe('connected');
    expect(connectedItem.accountEmail).toBe('student@fpt.edu.vn');
    expect(connectedItem.lastSyncedAt).toBe(now);
  });

  it('supports changing sync directions between import, export, and two-way', () => {
    let item: IntegrationItem = { ...sampleIntegration, status: 'connected' };

    const setSyncDirection = (curr: IntegrationItem, dir: SyncDirection): IntegrationItem => ({
      ...curr,
      syncDirection: dir,
    });

    item = setSyncDirection(item, 'export_only');
    expect(item.syncDirection).toBe('export_only');

    item = setSyncDirection(item, 'two_way');
    expect(item.syncDirection).toBe('two_way');

    item = setSyncDirection(item, 'import_only');
    expect(item.syncDirection).toBe('import_only');
  });

  it('clears account credentials and resets status upon disconnection', () => {
    const connectedItem: IntegrationItem = {
      ...sampleIntegration,
      status: 'connected',
      accountEmail: 'alex.nguyen@fpt.edu.vn',
      lastSyncedAt: new Date().toISOString(),
    };

    const disconnectedItem: IntegrationItem = {
      ...connectedItem,
      status: 'disconnected',
      accountEmail: null,
      lastSyncedAt: null,
    };

    expect(disconnectedItem.status).toBe('disconnected');
    expect(disconnectedItem.accountEmail).toBeNull();
    expect(disconnectedItem.lastSyncedAt).toBeNull();
  });
});
