import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAiChatStore } from '../../stores/aiChatStore';
import { aiApi, type ProposedActionDto } from '../../services/aiApi';

vi.mock('../../services/aiApi', () => ({
  aiApi: {
    getActiveConversation: vi.fn(),
    getMessages: vi.fn(),
    createConversation: vi.fn(),
    streamChat: vi.fn(),
    confirmAction: vi.fn(),
    cancelAction: vi.fn(),
    getAction: vi.fn(),
    analyzeVision: vi.fn(),
    sendVisionFeedback: vi.fn(),
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
      clientContext: {},
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

  it('sends a message and handles streaming tokens and completion with proposed actions', async () => {
    const mockAction: ProposedActionDto = {
      id: 'act-111',
      conversationId: 'conv-auto',
      tool: 'create_schedule',
      status: 'PROPOSED',
      summary: 'Tạo lịch họp nhóm',
      parameters: { title: 'Họp nhóm AI' },
      hasConflict: false,
      expiresAt: '2026-10-02T12:00:00Z',
      createdAt: '2026-10-02T11:45:00Z',
    };

    vi.mocked(aiApi.streamChat).mockImplementation(
      async (_message, _convId, onChunk, onComplete) => {
        onChunk('Tôi đã ');
        onChunk('tạo lịch.');
        onComplete({
          conversationId: 'conv-auto',
          messageId: 'resp-999',
          content: 'Tôi đã tạo lịch.',
          proposedActions: [mockAction],
        });
      }
    );

    await useAiChatStore.getState().sendMessage('Tạo lịch họp nhóm mai 9h');

    const state = useAiChatStore.getState();
    expect(state.messages).toHaveLength(2);
    expect(state.messages[0].role).toBe('user');
    expect(state.messages[0].content).toBe('Tạo lịch họp nhóm mai 9h');
    expect(state.messages[1].role).toBe('model');
    expect(state.messages[1].content).toBe('Tôi đã tạo lịch.');
    expect(state.messages[1].id).toBe('resp-999');
    expect(state.messages[1].proposedActions).toHaveLength(1);
    expect(state.messages[1].proposedActions?.[0].id).toBe('act-111');
    expect(state.activeConversationId).toBe('conv-auto');
    expect(state.isThinking).toBe(false);
    expect(state.isStreaming).toBe(false);
  });

  it('confirms action and updates status to SUCCESS', async () => {
    const actionId = 'act-confirm-test';
    const mockAction: ProposedActionDto = {
      id: actionId,
      conversationId: 'conv-1',
      tool: 'create_schedule',
      status: 'PROPOSED',
      summary: 'Tạo lịch mới',
      parameters: { title: 'Thực tập tốt nghiệp' },
      hasConflict: false,
      expiresAt: '2026-10-02T12:00:00Z',
      createdAt: '2026-10-02T11:45:00Z',
    };

    useAiChatStore.setState({
      messages: [
        {
          id: 'm1',
          role: 'model',
          content: 'Xác nhận tạo lịch:',
          createdAt: '2026-10-02T11:45:00Z',
          proposedActions: [mockAction],
        },
      ],
    });

    vi.mocked(aiApi.confirmAction).mockResolvedValueOnce({
      actionId,
      status: 'SUCCESS',
      message: 'Đã tạo sự kiện Thực tập tốt nghiệp thành công!',
    });

    await useAiChatStore.getState().confirmAction(actionId);

    expect(aiApi.confirmAction).toHaveBeenCalledWith(actionId);
    const updatedAction = useAiChatStore.getState().messages[0].proposedActions?.[0];
    expect(updatedAction?.status).toBe('SUCCESS');
    expect(updatedAction?.resultDetails).toContain('thành công');
  });

  it('cancels action and updates status to CANCELLED', async () => {
    const actionId = 'act-cancel-test';
    const mockAction: ProposedActionDto = {
      id: actionId,
      conversationId: 'conv-1',
      tool: 'delete_schedule',
      status: 'PROPOSED',
      summary: 'Xóa sự kiện',
      parameters: { title: 'Họp CLB' },
      hasConflict: false,
      expiresAt: '2026-10-02T12:00:00Z',
      createdAt: '2026-10-02T11:45:00Z',
    };

    useAiChatStore.setState({
      messages: [
        {
          id: 'm1',
          role: 'model',
          content: 'Xác nhận xóa:',
          createdAt: '2026-10-02T11:45:00Z',
          proposedActions: [mockAction],
        },
      ],
    });

    vi.mocked(aiApi.cancelAction).mockResolvedValueOnce({
      actionId,
      status: 'CANCELLED',
      message: 'Đã hủy thao tác xóa sự kiện.',
    });

    await useAiChatStore.getState().cancelAction(actionId);

    expect(aiApi.cancelAction).toHaveBeenCalledWith(actionId);
    const updatedAction = useAiChatStore.getState().messages[0].proposedActions?.[0];
    expect(updatedAction?.status).toBe('CANCELLED');
  });

  it('updates and passes clientContext to streamChat', async () => {
    useAiChatStore.getState().setClientContext({
      page: '/calendar',
      selectedDate: '2026-10-05',
    });

    vi.mocked(aiApi.streamChat).mockImplementation(
      async (_msg, _conv, _chunk, onComplete, _err, ctx) => {
        expect(ctx?.page).toBe('/calendar');
        expect(ctx?.selectedDate).toBe('2026-10-05');
        onComplete({
          conversationId: 'conv-1',
          content: 'Đã nhận ngữ cảnh lịch.',
        });
      }
    );

    await useAiChatStore.getState().sendMessage('Lịch ngày này thế nào?');

    expect(aiApi.streamChat).toHaveBeenCalled();
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

  it('updates and persists bubble position', () => {
    useAiChatStore.getState().setBubblePosition({ x: 150, y: 300 });
    expect(useAiChatStore.getState().bubblePosition).toEqual({ x: 150, y: 300 });

    useAiChatStore.getState().setBubblePosition(null);
    expect(useAiChatStore.getState().bubblePosition).toBeNull();
  });

  it('sends vision file and attaches structured visionResult to model message', async () => {
    const fakeFile = new File(['fake-image-bytes'], 'tkb.png', { type: 'image/png' });
    const mockVisionResponse = {
      resultId: 'vis-123',
      documentType: 'TIMETABLE',
      provider: 'paddleocr-vl-1.5',
      model: 'PaddleOCR-VL-v1.5',
      confidence: 0.94,
      events: [
        {
          title: 'Toán Giải Tích',
          day_of_week: 'Thứ Hai',
          start_time: '08:00',
          end_time: '09:30',
          confidence: 0.95,
        },
      ],
      tasks: [],
      deadlines: [],
      summary: 'Đã nhận diện 1 môn học từ thời khóa biểu.',
      warnings: [],
      createdAt: new Date().toISOString(),
    };

    vi.mocked(aiApi.analyzeVision).mockResolvedValue(mockVisionResponse as any);

    await useAiChatStore.getState().sendVisionFile(fakeFile, 'TIMETABLE', 'Nhập lịch giúp tôi');

    expect(aiApi.analyzeVision).toHaveBeenCalledWith(fakeFile, 'Nhập lịch giúp tôi', 'TIMETABLE', undefined);

    const messages = useAiChatStore.getState().messages;
    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe('user');
    expect(messages[0].content).toContain('[Tải lên ảnh: tkb.png] Nhập lịch giúp tôi');

    expect(messages[1].role).toBe('model');
    expect(messages[1].content).toBe('Đã nhận diện 1 môn học từ thời khóa biểu.');
    expect(messages[1].visionResult).toEqual(mockVisionResponse);
    expect(useAiChatStore.getState().isThinking).toBe(false);
  });

  it('handles vision analysis error and enters error state', async () => {
    const fakeFile = new File(['bad-bytes'], 'broken.png', { type: 'image/png' });
    vi.mocked(aiApi.analyzeVision).mockRejectedValue(new Error('IMAGE_CORRUPTED: Không thể giải mã tệp ảnh'));

    await useAiChatStore.getState().sendVisionFile(fakeFile, 'TIMETABLE');

    const state = useAiChatStore.getState();
    expect(state.error).toContain('Lỗi phân tích ảnh');
    expect(state.mascotState).toBe('ERROR');
    expect(state.isThinking).toBe(false);
  });
});
