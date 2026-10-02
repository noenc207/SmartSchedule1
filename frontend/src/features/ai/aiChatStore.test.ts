import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAiChatStore } from '../../stores/aiChatStore';
import { aiApi } from '../../services/aiApi';

vi.mock('../../services/aiApi', () => ({
  aiApi: {
    getActiveConversation: vi.fn(),
    getMessages: vi.fn(),
    createConversation: vi.fn(),
    streamChat: vi.fn(),
  },
}));

describe('aiChatStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAiChatStore.setState({
      isOpen: false,
      activeConversationId: null,
      messages: [],
      isThinking: false,
      isStreaming: false,
      error: null,
      unreadCount: 0,
      mascotState: 'IDLE',
    });
  });

  it('toggles open state and resets unread count when opening', () => {
    useAiChatStore.setState({ unreadCount: 3 });

    useAiChatStore.getState().toggleOpen();

    expect(useAiChatStore.getState().isOpen).toBe(true);
    expect(useAiChatStore.getState().unreadCount).toBe(0);
    expect(useAiChatStore.getState().mascotState).toBe('OPEN');

    useAiChatStore.getState().toggleOpen();

    expect(useAiChatStore.getState().isOpen).toBe(false);
    expect(useAiChatStore.getState().mascotState).toBe('IDLE');
  });

  it('updates hover state only when closed and not thinking', () => {
    useAiChatStore.getState().setMascotHover(true);
    expect(useAiChatStore.getState().mascotState).toBe('HOVER');

    useAiChatStore.getState().setMascotHover(false);
    expect(useAiChatStore.getState().mascotState).toBe('IDLE');

    // When open, hover should not override OPEN state
    useAiChatStore.getState().setOpen(true);
    expect(useAiChatStore.getState().mascotState).toBe('OPEN');
    useAiChatStore.getState().setMascotHover(true);
    expect(useAiChatStore.getState().mascotState).toBe('OPEN');
  });

  it('loads active conversation and past messages', async () => {
    vi.mocked(aiApi.getActiveConversation).mockResolvedValueOnce({
      id: 'conv-123',
      title: 'Hội thoại test',
      createdAt: '2026-10-02T10:00:00Z',
      updatedAt: '2026-10-02T10:00:00Z',
      messageCount: 2,
    });
    vi.mocked(aiApi.getMessages).mockResolvedValueOnce([
      { id: 'm1', role: 'user', content: 'Chào AI', createdAt: '2026-10-02T10:00:01Z' },
      { id: 'm2', role: 'model', content: 'Chào bạn!', createdAt: '2026-10-02T10:00:02Z' },
    ]);

    await useAiChatStore.getState().loadHistory();

    expect(aiApi.getActiveConversation).toHaveBeenCalledTimes(1);
    expect(aiApi.getMessages).toHaveBeenCalledWith('conv-123');
    expect(useAiChatStore.getState().activeConversationId).toBe('conv-123');
    expect(useAiChatStore.getState().messages).toHaveLength(2);
  });

  it('creates a new conversation and resets messages', async () => {
    useAiChatStore.setState({
      activeConversationId: 'old-conv',
      messages: [{ id: 'm1', role: 'user', content: 'test', createdAt: '2026-10-02T10:00:00Z' }],
    });

    vi.mocked(aiApi.createConversation).mockResolvedValueOnce({
      id: 'new-conv-456',
      title: 'Cuộc trò chuyện mới',
      createdAt: '2026-10-02T11:00:00Z',
      updatedAt: '2026-10-02T11:00:00Z',
      messageCount: 0,
    });

    await useAiChatStore.getState().newConversation();

    expect(aiApi.createConversation).toHaveBeenCalledWith('Cuộc trò chuyện mới');
    expect(useAiChatStore.getState().activeConversationId).toBe('new-conv-456');
    expect(useAiChatStore.getState().messages).toEqual([]);
    expect(useAiChatStore.getState().isThinking).toBe(false);
  });

  it('sends a message and handles streaming tokens and completion', async () => {
    vi.mocked(aiApi.streamChat).mockImplementation(
      async (_message, _convId, onChunk, onComplete) => {
        onChunk('Hôm ');
        onChunk('nay ');
        onChunk('bạn có lịch.');
        onComplete({
          conversationId: 'conv-auto',
          messageId: 'resp-999',
          content: 'Hôm nay bạn có lịch.',
        });
      }
    );

    await useAiChatStore.getState().sendMessage('Hôm nay tôi có gì?');

    const state = useAiChatStore.getState();
    expect(state.messages).toHaveLength(2);
    expect(state.messages[0].role).toBe('user');
    expect(state.messages[0].content).toBe('Hôm nay tôi có gì?');
    expect(state.messages[1].role).toBe('model');
    expect(state.messages[1].content).toBe('Hôm nay bạn có lịch.');
    expect(state.messages[1].id).toBe('resp-999');
    expect(state.activeConversationId).toBe('conv-auto');
    expect(state.isThinking).toBe(false);
    expect(state.isStreaming).toBe(false);
  });

  it('handles stream errors gracefully and marks error state', async () => {
    vi.mocked(aiApi.streamChat).mockImplementation(
      async (_msg, _convId, _onChunk, _onComp, onError) => {
        onError?.(new Error('Rate limit exceeded: Vui lòng thử lại sau'));
      }
    );

    await useAiChatStore.getState().sendMessage('Xin chào');

    const state = useAiChatStore.getState();
    expect(state.error).toContain('Rate limit exceeded');
    expect(state.mascotState).toBe('ERROR');
    expect(state.isThinking).toBe(false);
    expect(state.isStreaming).toBe(false);
    expect(state.messages[1].content).toContain('Xin lỗi, tôi gặp sự cố');
  });
});
