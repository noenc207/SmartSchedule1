import { create } from 'zustand';
import { aiApi, type ChatMessageDto, type ClientContextDto, type ProposedActionDto } from '../services/aiApi';
import { getApiErrorMessage } from '../services/apiClient';
import { showToast } from '../components/Toast';

export type MascotState = 'IDLE' | 'HOVER' | 'OPEN' | 'THINKING' | 'ERROR';

export interface BubblePosition {
  x: number;
  y: number;
}

const loadInitialBubblePosition = (): BubblePosition | null => {
  try {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem('smartschedule_ai_bubble_pos');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.x === 'number' && typeof parsed?.y === 'number') {
      const maxX = Math.max(12, window.innerWidth - 76);
      const maxY = Math.max(12, window.innerHeight - 76);
      return {
        x: Math.max(12, Math.min(maxX, parsed.x)),
        y: Math.max(12, Math.min(maxY, parsed.y)),
      };
    }
  } catch {
    /* ignore */
  }
  return null;
};

export interface AiChatState {
  isOpen: boolean;
  activeConversationId: string | null;
  messages: ChatMessageDto[];
  isThinking: boolean;
  isStreaming: boolean;
  error: string | null;
  unreadCount: number;
  mascotState: MascotState;
  bubblePosition: BubblePosition | null;
  clientContext: ClientContextDto;

  toggleOpen: () => void;
  setOpen: (open: boolean) => void;
  setMascotHover: (hover: boolean) => void;
  setBubblePosition: (pos: BubblePosition | null) => void;
  setClientContext: (ctx: Partial<ClientContextDto>) => void;
  loadHistory: () => Promise<void>;
  sendMessage: (text: string) => Promise<void>;
  confirmAction: (actionId: string) => Promise<void>;
  cancelAction: (actionId: string) => Promise<void>;
  newConversation: () => Promise<void>;
  clearError: () => void;
}

export const useAiChatStore = create<AiChatState>((set, get) => ({
  isOpen: false,
  activeConversationId: null,
  messages: [],
  isThinking: false,
  isStreaming: false,
  error: null,
  unreadCount: 0,
  mascotState: 'IDLE',
  bubblePosition: loadInitialBubblePosition(),
  clientContext: {},

  setClientContext: (ctx) => {
    set((state) => ({
      clientContext: { ...state.clientContext, ...ctx },
    }));
  },

  setBubblePosition: (pos) => {
    set({ bubblePosition: pos });
    try {
      if (pos) {
        localStorage.setItem('smartschedule_ai_bubble_pos', JSON.stringify(pos));
      } else {
        localStorage.removeItem('smartschedule_ai_bubble_pos');
      }
    } catch {
      /* ignore */
    }
  },

  toggleOpen: () => {
    const nextOpen = !get().isOpen;
    set({
      isOpen: nextOpen,
      unreadCount: nextOpen ? 0 : get().unreadCount,
      mascotState: nextOpen ? 'OPEN' : 'IDLE',
    });
    if (nextOpen && get().messages.length === 0) {
      void get().loadHistory();
    }
  },

  setOpen: (open: boolean) => {
    set({
      isOpen: open,
      unreadCount: open ? 0 : get().unreadCount,
      mascotState: open ? 'OPEN' : 'IDLE',
    });
    if (open && get().messages.length === 0) {
      void get().loadHistory();
    }
  },

  setMascotHover: (hover: boolean) => {
    const current = get();
    if (current.isOpen) return;
    if (current.isThinking) return;
    set({ mascotState: hover ? 'HOVER' : 'IDLE' });
  },

  clearError: () => set({ error: null }),

  loadHistory: async () => {
    try {
      const activeConv = await aiApi.getActiveConversation();
      if (!activeConv?.id) return;
      set({ activeConversationId: activeConv.id });

      const pastMessages = await aiApi.getMessages(activeConv.id);
      set({ messages: pastMessages ?? [], error: null });
    } catch (err) {
      // Don't show disruptive error on silent initial load
      console.warn('Could not load AI chat history:', err);
    }
  },

  newConversation: async () => {
    try {
      set({ isThinking: true, error: null });
      const newConv = await aiApi.createConversation('Cuộc trò chuyện mới');
      set({
        activeConversationId: newConv.id,
        messages: [],
        isThinking: false,
        error: null,
      });
    } catch (err) {
      set({ error: getApiErrorMessage(err), isThinking: false });
    }
  },

  confirmAction: async (actionId: string) => {
    try {
      const res = await aiApi.confirmAction(actionId);
      set((state) => ({
        messages: state.messages.map((msg) => {
          if (!msg.proposedActions || msg.proposedActions.length === 0) return msg;
          return {
            ...msg,
            proposedActions: msg.proposedActions.map((act) =>
              act.id === actionId
                ? {
                    ...act,
                    status: res.status || 'SUCCESS',
                    resultDetails: res.message || 'Thao tác đã được áp dụng thành công.',
                  }
                : act
            ),
          };
        }),
      }));

      showToast(res.message || 'Đã áp dụng thay đổi lịch thành công!', 'success');
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('smartschedule:calendar-refresh'));
      }
    } catch (err) {
      const errMsg = getApiErrorMessage(err);
      set((state) => ({
        messages: state.messages.map((msg) => {
          if (!msg.proposedActions) return msg;
          return {
            ...msg,
            proposedActions: msg.proposedActions.map((act) =>
              act.id === actionId ? { ...act, status: 'FAILED', errorMessage: errMsg } : act
            ),
          };
        }),
      }));
      showToast(`Không thể thực thi: ${errMsg}`, 'error');
      throw err;
    }
  },

  cancelAction: async (actionId: string) => {
    try {
      const res = await aiApi.cancelAction(actionId);
      set((state) => ({
        messages: state.messages.map((msg) => {
          if (!msg.proposedActions || msg.proposedActions.length === 0) return msg;
          return {
            ...msg,
            proposedActions: msg.proposedActions.map((act) =>
              act.id === actionId
                ? {
                    ...act,
                    status: 'CANCELLED',
                    resultDetails: res.message || 'Đã hủy thao tác.',
                  }
                : act
            ),
          };
        }),
      }));
      showToast('Đã hủy thao tác.', 'info');
    } catch (err) {
      const errMsg = getApiErrorMessage(err);
      set((state) => ({
        messages: state.messages.map((msg) => {
          if (!msg.proposedActions) return msg;
          return {
            ...msg,
            proposedActions: msg.proposedActions.map((act) =>
              act.id === actionId ? { ...act, status: 'CANCELLED', errorMessage: errMsg } : act
            ),
          };
        }),
      }));
      showToast(`Không thể hủy: ${errMsg}`, 'error');
      throw err;
    }
  },

  sendMessage: async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || get().isThinking || get().isStreaming) return;

    const tempUserId = 'user-' + Date.now();
    const tempUserMessage: ChatMessageDto = {
      id: tempUserId,
      role: 'user',
      content: trimmed,
      createdAt: new Date().toISOString(),
    };

    const tempModelId = 'model-' + Date.now();
    const tempModelMessage: ChatMessageDto = {
      id: tempModelId,
      role: 'model',
      content: '',
      createdAt: new Date().toISOString(),
    };

    set((state) => ({
      messages: [...state.messages, tempUserMessage, tempModelMessage],
      isThinking: true,
      isStreaming: true,
      error: null,
      mascotState: 'THINKING',
    }));

    const conversationId = get().activeConversationId || undefined;
    const currentContext = get().clientContext;
    const resolvedContext: ClientContextDto = {
      page: currentContext.page || (typeof window !== 'undefined' ? window.location.pathname : undefined),
      selectedDate: currentContext.selectedDate,
      selectedEventId: currentContext.selectedEventId,
      selectedEventTitle: currentContext.selectedEventTitle,
      timezone: currentContext.timezone || (typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'Asia/Ho_Chi_Minh'),
    };

    try {
      await aiApi.streamChat(
        trimmed,
        conversationId,
        (chunk) => {
          set((state) => {
            const updated = [...state.messages];
            const last = updated[updated.length - 1];
            if (last && last.role === 'model') {
              last.content += chunk;
            }
            return {
              messages: updated,
              isThinking: false, // Got first token, now actively streaming
              mascotState: state.isOpen ? 'OPEN' : 'THINKING',
            };
          });
        },
        (completed) => {
          set((state) => {
            const updated = [...state.messages];
            const last = updated[updated.length - 1];
            if (last && last.role === 'model') {
              if (completed.content) last.content = completed.content;
              if (completed.messageId) last.id = completed.messageId;
              if (completed.proposedActions && completed.proposedActions.length > 0) {
                last.proposedActions = completed.proposedActions;
              }
            }
            return {
              messages: updated,
              activeConversationId: completed.conversationId || state.activeConversationId,
              isThinking: false,
              isStreaming: false,
              mascotState: state.isOpen ? 'OPEN' : 'IDLE',
              unreadCount: state.isOpen ? 0 : state.unreadCount + 1,
            };
          });
        },
        (streamErr) => {
          const errMsg = getApiErrorMessage(streamErr);
          set((state) => {
            const updated = [...state.messages];
            const last = updated[updated.length - 1];
            if (last && last.role === 'model' && !last.content) {
              last.content = `Xin lỗi, tôi gặp sự cố: ${errMsg}`;
            }
            return {
              messages: updated,
              isThinking: false,
              isStreaming: false,
              error: errMsg,
              mascotState: 'ERROR',
            };
          });
        },
        resolvedContext
      );
    } catch (err) {
      const errMsg = getApiErrorMessage(err);
      set((state) => {
        const updated = [...state.messages];
        const last = updated[updated.length - 1];
        if (last && last.role === 'model' && !last.content) {
          last.content = `Không thể kết nối đến AI: ${errMsg}`;
        }
        return {
          messages: updated,
          isThinking: false,
          isStreaming: false,
          error: errMsg,
          mascotState: 'ERROR',
        };
      });
    }
  },
}));
