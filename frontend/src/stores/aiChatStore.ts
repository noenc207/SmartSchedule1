import { create } from 'zustand';
import { aiApi, type ChatMessageDto } from '../services/aiApi';
import { getApiErrorMessage } from '../services/apiClient';

export type MascotState = 'IDLE' | 'HOVER' | 'OPEN' | 'THINKING' | 'ERROR';

export interface AiChatState {
  isOpen: boolean;
  activeConversationId: string | null;
  messages: ChatMessageDto[];
  isThinking: boolean;
  isStreaming: boolean;
  error: string | null;
  unreadCount: number;
  mascotState: MascotState;

  toggleOpen: () => void;
  setOpen: (open: boolean) => void;
  setMascotHover: (hover: boolean) => void;
  loadHistory: () => Promise<void>;
  sendMessage: (text: string) => Promise<void>;
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
            if (last && last.role === 'model' && completed.content) {
              last.content = completed.content;
              if (completed.messageId) last.id = completed.messageId;
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
        }
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
