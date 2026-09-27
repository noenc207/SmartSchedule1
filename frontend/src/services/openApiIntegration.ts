/**
 * Open API Standard Payloads & Parsers for LMS (Canvas, Moodle) & Enterprise HR Systems
 */

import type { EventItem, Task } from '../types/domain';

export interface BatchEventInput {
  title: string;
  startsAt: string; // ISO
  endsAt: string;   // ISO
  locationName?: string;
  latitude?: number;
  longitude?: number;
  description?: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH';
  fixed?: boolean;
  notes?: string;
}

export interface BatchImportPayload {
  sourceSystem?: 'CANVAS_LMS' | 'MOODLE' | 'ENTERPRISE_HR' | 'CUSTOM';
  scheduleId?: string;
  events: BatchEventInput[];
}

/**
 * Parses raw JSON exported or pushed from Canvas LMS Calendar API
 */
export function parseCanvasLmsPayload(rawJson: any): BatchImportPayload {
  const items = Array.isArray(rawJson) ? rawJson : rawJson?.events || rawJson?.assignments || [];
  const events: BatchEventInput[] = [];

  for (const item of items) {
    const title = item.title || item.name || 'Canvas LMS Course Milestone';
    const startsAt = item.start_at || item.due_at || item.startsAt;
    if (!startsAt) continue;

    // If only due_at / deadline is provided, schedule a 60-min session prior
    let endsAt = item.end_at || item.endsAt;
    let computedStart = startsAt;
    if (!endsAt) {
      const d = new Date(startsAt);
      const s = new Date(d.getTime() - 60 * 60 * 1000);
      computedStart = s.toISOString();
      endsAt = d.toISOString();
    }

    events.push({
      title: `[LMS] ${title}`,
      startsAt: computedStart,
      endsAt,
      description: item.description || (item.points_possible ? `Điểm số tối đa: ${item.points_possible}` : undefined),
      locationName: item.location_name || 'Online (Canvas LMS)',
      priority: item.important || (item.points_possible && item.points_possible > 20) ? 'HIGH' : 'MEDIUM',
      fixed: true,
      notes: `Đồng bộ từ Canvas LMS · Khóa học: ${item.context_name || item.course_id || 'Chính khóa'}`,
    });
  }

  return {
    sourceSystem: 'CANVAS_LMS',
    events,
  };
}

/**
 * Parses raw JSON exported or pushed from Moodle iCal / Course Calendar
 */
export function parseMoodlePayload(rawJson: any): BatchImportPayload {
  const items = Array.isArray(rawJson) ? rawJson : rawJson?.events || [];
  const events: BatchEventInput[] = [];

  for (const item of items) {
    const title = item.name || item.summary || 'Moodle Activity';
    const timestart = item.timestart ? new Date(item.timestart * 1000).toISOString() : item.startsAt;
    const timeend = item.timeduration
      ? new Date((item.timestart + item.timeduration) * 1000).toISOString()
      : item.endsAt || new Date(new Date(timestart).getTime() + 90 * 60 * 1000).toISOString();

    if (!timestart) continue;

    events.push({
      title: `[Moodle] ${title}`,
      startsAt: timestart,
      endsAt: timeend,
      description: item.description || '',
      locationName: item.location || 'Hệ thống Moodle',
      priority: 'MEDIUM',
      fixed: true,
      notes: `Khóa học Moodle: ${item.course?.fullname || item.courseid || ''}`,
    });
  }

  return {
    sourceSystem: 'MOODLE',
    events,
  };
}

/**
 * Parses raw JSON pushed from Enterprise HR / Shift Management software
 */
export function parseHrShiftPayload(rawJson: any): BatchImportPayload {
  const shifts = Array.isArray(rawJson) ? rawJson : rawJson?.shifts || rawJson?.events || [];
  const events: BatchEventInput[] = [];

  for (const shift of shifts) {
    const title = shift.shift_title || shift.title || `Ca làm việc (${shift.department || 'Doanh nghiệp'})`;
    const startsAt = shift.start_time || shift.startsAt;
    const endsAt = shift.end_time || shift.endsAt;
    if (!startsAt || !endsAt) continue;

    events.push({
      title: `[HR] ${title}`,
      startsAt,
      endsAt,
      description: `Mã nhân viên: ${shift.employee_id || 'N/A'} · Bộ phận: ${shift.department || 'Kinh doanh'}`,
      locationName: shift.location_address || shift.branch || 'Tòa nhà công ty',
      priority: 'HIGH',
      fixed: true,
      notes: shift.notes || 'Ca làm việc chính thức được phân công bởi phòng Nhân sự (HR).',
    });
  }

  return {
    sourceSystem: 'ENTERPRISE_HR',
    events,
  };
}

/**
 * Generates official OpenAPI 3.0 specification for external university LMS & Enterprise HR developers
 */
export function generateOpenApiSpec(): object {
  return {
    openapi: '3.0.3',
    info: {
      title: 'SmartSchedule Ingestion & Synchronization Open API',
      version: '1.0.0',
      description:
        'Standardized REST endpoints and webhooks for University LMS (Canvas, Moodle, Blackboard) and Enterprise HR software to push academic schedules, shifts, and milestones with multi-tenant data isolation.',
      contact: {
        name: 'SmartSchedule API Engineering',
        email: 'api-support@smartschedul.ai',
      },
    },
    servers: [
      {
        url: 'https://smartschedul.ai/api/v1',
        description: 'Production Cloud API Gateway',
      },
      {
        url: 'http://localhost:5173/api/v1',
        description: 'Local Developer Sandbox',
      },
    ],
    paths: {
      '/open/schedules/batch-import': {
        post: {
          summary: 'Standard Batch Event Ingestion',
          description: 'Ingests multiple schedule items into an isolated tenant schedule using an API key.',
          security: [{ ApiKeyAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['events'],
                  properties: {
                    sourceSystem: { type: 'string', example: 'CANVAS_LMS' },
                    scheduleId: { type: 'string', example: 'demo-schedule' },
                    events: {
                      type: 'array',
                      items: {
                        type: 'object',
                        required: ['title', 'startsAt', 'endsAt'],
                        properties: {
                          title: { type: 'string', example: 'Advanced Machine Learning Lecture' },
                          startsAt: { type: 'string', format: 'date-time', example: '2026-09-24T08:00:00Z' },
                          endsAt: { type: 'string', format: 'date-time', example: '2026-09-24T10:00:00Z' },
                          locationName: { type: 'string', example: 'Phòng Lab AI 1' },
                          priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'], example: 'HIGH' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          responses: {
            '201': {
              description: 'Events successfully ingested',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      importedCount: { type: 'integer', example: 4 },
                      message: { type: 'string', example: 'Successfully ingested 4 schedule events.' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/open/integrations/lms/sync': {
        post: {
          summary: 'Canvas / Moodle LMS Webhook Ingestion',
          description: 'Receives webhook callbacks from Canvas, Moodle, or custom LMS when course timetables or deadlines are updated.',
          security: [{ ApiKeyAuth: [] }],
          responses: {
            '200': { description: 'LMS webhook processed successfully' },
          },
        },
      },
      '/open/integrations/hr/events': {
        post: {
          summary: 'Enterprise HR Shift & Meeting Ingestion',
          description: 'Receives employee shift allocations and corporate meeting calendar events from HR systems.',
          security: [{ ApiKeyAuth: [] }],
          responses: {
            '200': { description: 'HR shift schedule processed successfully' },
          },
        },
      },
    },
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'x-api-key',
        },
      },
    },
  };
}
