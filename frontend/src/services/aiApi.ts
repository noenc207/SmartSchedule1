import apiClient, { getStoredAccessToken } from './apiClient';

export type ActionStatus = 'PROPOSED' | 'CONFIRMED' | 'EXECUTING' | 'SUCCESS' | 'FAILED' | 'CANCELLED';

export interface ProposedActionDto {
  id: string;
  conversationId: string;
  tool: 'create_schedule' | 'update_schedule' | 'delete_schedule' | 'reschedule_event' | 'replace_schedule' | string;
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
}

export interface ActionConfirmResponse {
  actionId: string;
  status: ActionStatus;
  message: string;
  targetEventId?: string;
  data?: Record<string, any>;
}

export interface ClientContextDto {
  page?: string;
  selectedDate?: string;
  selectedEventId?: string;
  selectedEventTitle?: string;
  timezone?: string;
}

export interface ChatMessageDto {
  id: string;
  role: 'user' | 'model';
  content: string;
  createdAt: string;
  proposedActions?: ProposedActionDto[];
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
    const rawApiUrl =
      import.meta.env.VITEAPIURL ||
      import.meta.env.VITE_API_URL ||
      import.meta.env.VITE_API_BASE_URL ||
      'http://localhost:8080';
    const baseUrl = rawApiUrl.endsWith('/api/v1')
      ? rawApiUrl
      : `${rawApiUrl.replace(/\/+$/, '')}/api/v1`;

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
};
