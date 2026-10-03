import apiClient, { getApiBaseUrl, getStoredAccessToken } from './apiClient';

export type ActionStatus = 'PROPOSED' | 'CONFIRMED' | 'EXECUTING' | 'SUCCESS' | 'FAILED' | 'CANCELLED';

export interface ProposedActionDto {
  id: string;
  conversationId: string;
  tool:
    | 'create_schedule'
    | 'update_schedule'
    | 'delete_schedule'
    | 'reschedule_event'
    | 'replace_schedule'
    | 'create_task'
    | 'update_task'
    | 'delete_task'
    | 'complete_task'
    | 'create_deadline'
    | 'update_reminder'
    | 'navigate_to'
    | 'update_user_preferences'
    | 'create_study_plan'
    | 'optimize_day'
    | 'optimize_week'
    | 'batch_action'
    | 'import_google_sheet_events'
    | 'import_google_calendar'
    | 'export_to_google_calendar'
    | 'sync_google_calendar'
    | string;
  status: ActionStatus;
  summary: string;
  parameters: Record<string, any>;
  hasConflict: boolean;
  conflictDetails?: string;
  targetEventId?: string;
  expiresAt: string;
  createdAt: string;
  resultDetails?: string;
  errorMessage?: string;
  riskLevel?: 'READ' | 'LOW_WRITE' | 'IMPORTANT_WRITE' | 'HIGH_RISK' | string;
  planId?: string;
  stepOrder?: number;
  subActions?: ProposedActionDto[];
}

export interface ActionConfirmResponse {
  actionId: string;
  status: ActionStatus;
  message: string;
  targetEventId?: string;
  data?: Record<string, any>;
}

export interface PlanConfirmResponse {
  planId: string;
  status: ActionStatus;
  message: string;
  results: ActionConfirmResponse[];
}

export interface ClientContextDto {
  page?: string;
  selectedDate?: string;
  selectedEventId?: string;
  selectedEventTitle?: string;
  selectedTaskId?: string;
  lastTargetId?: string;
  timezone?: string;
  activeContextMode?: 'ACADEMIC' | 'WORK' | 'PERSONAL' | 'GENERAL';
  preferredLanguage?: 'vi' | 'en';
}

export interface ChatMessageDto {
  id: string;
  role: 'user' | 'model';
  content: string;
  createdAt: string;
  proposedActions?: ProposedActionDto[];
  visionResult?: VisionAnalysisResponse;
}

export interface ConversationDto {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount?: number;
}

export interface ChatResponseDto {
  conversationId: string;
  messageId: string;
  role: 'model';
  content: string;
  createdAt: string;
  proposedActions?: ProposedActionDto[];
}

export const aiApi = {
  async chat(message: string, conversationId?: string, context?: ClientContextDto): Promise<ChatResponseDto> {
    const { data } = await apiClient.post<ChatResponseDto>('/ai/chat', {
      message,
      conversationId: conversationId || undefined,
      stream: false,
      context,
    });
    return data;
  },

  async streamChat(
    message: string,
    conversationId: string | undefined,
    onChunk: (chunk: string) => void,
    onComplete: (data: Partial<ChatResponseDto>) => void,
    onError: (err: any) => void,
    context?: ClientContextDto
  ): Promise<void> {
    const baseUrl = getApiBaseUrl();

    const token = getStoredAccessToken();

    try {
      const response = await fetch(`${baseUrl}/ai/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          message,
          conversationId: conversationId || undefined,
          stream: true,
          context,
        }),
      });

      if (!response.ok) {
        let errorData: any = {};
        try {
          errorData = await response.json();
        } catch {
          errorData = { message: `HTTP ${response.status}: ${response.statusText}` };
        }
        throw new Error(errorData.message || 'Lỗi khi gọi AI streaming.');
      }

      if (!response.body) {
        throw new Error('Response body is null.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data:')) {
            const dataStr = trimmed.substring(5).trim();
            if (!dataStr || dataStr === '[DONE]') continue;
            try {
              const payload = JSON.parse(dataStr);
              if (payload.error) {
                onError(new Error(payload.error));
                return;
              }
              if (payload.chunk) {
                onChunk(payload.chunk);
              }
              if (payload.done) {
                onComplete({
                  conversationId: payload.conversationId,
                  messageId: payload.messageId,
                  content: payload.content,
                  role: payload.role || 'model',
                  proposedActions: payload.proposedActions || [],
                });
              }
            } catch (jsonErr) {
              // Ignore partial JSON
            }
          }
        }
      }
    } catch (err: any) {
      // Fallback to non-streaming chat if SSE fails
      try {
        const fallbackRes = await aiApi.chat(message, conversationId, context);
        onChunk(fallbackRes.content);
        onComplete(fallbackRes);
      } catch (fallbackErr) {
        onError(err);
      }
    }
  },

  async confirmAction(actionId: string): Promise<ActionConfirmResponse> {
    const { data } = await apiClient.post<ActionConfirmResponse>(`/ai/actions/${actionId}/confirm`);
    return data;
  },

  async cancelAction(actionId: string): Promise<ActionConfirmResponse> {
    const { data } = await apiClient.post<ActionConfirmResponse>(`/ai/actions/${actionId}/cancel`);
    return data;
  },

  async confirmPlan(planId: string): Promise<PlanConfirmResponse> {
    const { data } = await apiClient.post<PlanConfirmResponse>(`/ai/plans/${planId}/confirm`);
    return data;
  },

  async cancelPlan(planId: string): Promise<PlanConfirmResponse> {
    const { data } = await apiClient.post<PlanConfirmResponse>(`/ai/plans/${planId}/cancel`);
    return data;
  },

  async getAction(actionId: string): Promise<ProposedActionDto> {
    const { data } = await apiClient.get<ProposedActionDto>(`/ai/actions/${actionId}`);
    return data;
  },

  async getConversations(): Promise<ConversationDto[]> {
    const { data } = await apiClient.get<ConversationDto[]>('/ai/conversations');
    return data;
  },

  async getActiveConversation(): Promise<ConversationDto> {
    const { data } = await apiClient.get<ConversationDto>('/ai/conversations/active');
    return data;
  },

  async createConversation(title?: string): Promise<ConversationDto> {
    const { data } = await apiClient.post<ConversationDto>('/ai/conversations', { title });
    return data;
  },

  async getMessages(conversationId: string): Promise<ChatMessageDto[]> {
    const { data } = await apiClient.get<ChatMessageDto[]>(`/ai/conversations/${conversationId}/messages`);
    return data;
  },

  async deleteConversation(conversationId: string): Promise<void> {
    await apiClient.delete(`/ai/conversations/${conversationId}`);
  },

  // =========================================================================
  // VISION MICROSERVICE ENDPOINTS
  // =========================================================================
  async analyzeVision(
    file: File,
    instruction?: string,
    mode: string = 'TIMETABLE',
    conversationId?: string
  ): Promise<VisionAnalysisResponse> {
    const formData = new FormData();
    formData.append('file', file);
    if (instruction) formData.append('instruction', instruction);
    formData.append('mode', mode);
    if (conversationId) formData.append('conversation_id', conversationId);

    const { data } = await apiClient.post<VisionAnalysisResponse>('/ai/vision/analyze', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return data;
  },

  async getVisionResult(resultId: string): Promise<VisionAnalysisResponse> {
    const { data } = await apiClient.get<VisionAnalysisResponse>(`/ai/vision/results/${resultId}`);
    return data;
  },

  async sendVisionFeedback(feedback: VisionFeedbackRequest): Promise<{ status: string; message: string }> {
    const { data } = await apiClient.post<{ status: string; message: string }>('/ai/vision/feedback', feedback);
    return data;
  },

  // =========================================================================
  // GOOGLE WORKSPACE MICROSERVICE ENDPOINTS
  // =========================================================================
  async getGoogleWorkspaceStatus(): Promise<GoogleWorkspaceStatus> {
    const { data } = await apiClient.get<GoogleWorkspaceStatus>('/integrations/google/status');
    return data;
  },

  async connectGoogleWorkspace(payload: {
    code?: string;
    redirectUri?: string;
    accessToken?: string;
    refreshToken?: string;
    scopes?: string;
  }): Promise<GoogleWorkspaceStatus> {
    const { data } = await apiClient.post<GoogleWorkspaceStatus>('/integrations/google/connect', payload);
    return data;
  },

  async disconnectGoogleWorkspace(): Promise<void> {
    await apiClient.delete('/integrations/google/disconnect');
  },

  async listGoogleCalendars(): Promise<GoogleCalendarItem[]> {
    const { data } = await apiClient.get<GoogleCalendarItem[]>('/integrations/google/calendars');
    return data;
  },

  async analyzeGoogleSheet(spreadsheetUrl: string, sheetName?: string): Promise<SheetAnalysisResult> {
    const { data } = await apiClient.post<SheetAnalysisResult>('/integrations/google/sheets/analyze', {
      spreadsheetUrl,
      sheetName,
    });
    return data;
  },

  async importGoogleSheet(
    spreadsheetId: string,
    events: ParsedSheetEvent[],
    skipConflicts: boolean = false
  ): Promise<GoogleSyncResult> {
    const { data } = await apiClient.post<GoogleSyncResult>('/integrations/google/sheets/import', {
      spreadsheetId,
      events,
      skipConflicts,
    });
    return data;
  },

  async prepareGoogleCalendarImport(
    calendarId: string = 'primary',
    daysAhead: number = 14
  ): Promise<CalendarImportResult> {
    const { data } = await apiClient.post<CalendarImportResult>('/integrations/google/calendar/prepare', {
      calendarId,
      daysAhead,
    });
    return data;
  },

  async importGoogleCalendar(
    calendarId: string,
    events: ParsedSheetEvent[],
    skipConflicts: boolean = false
  ): Promise<GoogleSyncResult> {
    const { data } = await apiClient.post<GoogleSyncResult>('/integrations/google/calendar/import', {
      calendarId,
      events,
      skipConflicts,
    });
    return data;
  },

  async exportEventToGoogleCalendar(
    smartEventId: string,
    calendarId: string = 'primary'
  ): Promise<{ smartEventId: string; googleCalendarId: string; googleEventId: string; status: string; message: string }> {
    const { data } = await apiClient.post('/integrations/google/calendar/export', {
      smartEventId,
      calendarId,
    });
    return data;
  },
};

export interface VisionEventDto {
  title: string;
  date?: string;
  day_of_week?: string;
  start_time: string;
  end_time?: string;
  duration_minutes?: number;
  location?: string;
  description?: string;
  recurrence?: string;
  confidence: number;
}

export interface VisionTaskDto {
  title: string;
  estimated_minutes?: number;
  priority?: string;
  deadline?: string;
  confidence: number;
}

export interface VisionDeadlineDto {
  title: string;
  due_date: string;
  priority?: string;
  confidence: number;
}

export interface VisionAnalysisResponse {
  resultId: string;
  documentType: 'TIMETABLE' | 'DOCUMENT' | 'DEADLINE' | 'SCREENSHOT' | 'GENERAL_IMAGE' | string;
  provider: string;
  model: string;
  confidence: number;
  events: VisionEventDto[];
  tasks: VisionTaskDto[];
  deadlines: VisionDeadlineDto[];
  summary: string;
  warnings: string[];
  createdAt: string;
}

export interface VisionFeedbackRequest {
  resultId: string;
  accepted: boolean;
  corrections?: Record<string, any>;
  userNotes?: string;
}

export interface GoogleWorkspaceStatus {
  connected: boolean;
  provider: string;
  scopes: string;
  linkedCalendarsCount: number;
  connectedAt?: string;
  updatedAt?: string;
  googleEmail?: string;
}

export interface GoogleCalendarItem {
  id: string;
  summary: string;
  description?: string;
  primary: boolean;
  timeZone: string;
}

export interface ParsedSheetEvent {
  title: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  instructor?: string;
  confidence: number;
  sourceRow: number;
  hasConflict: boolean;
  conflictDetails?: string;
  missingFields: string[];
}

export interface SheetAnalysisResult {
  sourceType: string;
  spreadsheetId: string;
  sheetName: string;
  rowsDetected: number;
  eventsDetected: number;
  validEvents: number;
  missingTimeCount: number;
  conflictCount: number;
  events: ParsedSheetEvent[];
  warnings: string[];
}

export interface CalendarImportResult {
  calendarId: string;
  totalFound: number;
  newCount: number;
  duplicateCount: number;
  conflictCount: number;
  eventsToImport: ParsedSheetEvent[];
  warnings: string[];
}

export interface GoogleSyncResult {
  syncedCount: number;
  createdCount: number;
  updatedCount: number;
  conflictCount: number;
  message: string;
}

