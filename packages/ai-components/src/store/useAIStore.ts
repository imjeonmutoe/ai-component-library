import { create } from 'zustand';
import type { AIStatus, AIMessage, AIError } from '../types';

interface AIState {
  // 상태
  status: AIStatus;
  messages: AIMessage[];
  currentChunk: string;
  error: AIError | null;

  // 액션
  setStatus: (status: AIStatus) => void;
  addMessage: (message: AIMessage) => void;
  appendChunk: (chunk: string) => void;
  commitStream: () => void;
  setError: (error: AIError | null) => void;
  clearMessages: () => void;
  reset: () => void;
}

const initialState = {
  status: 'idle' as AIStatus,
  messages: [],
  currentChunk: '',
  error: null,
};

export const useAIStore = create<AIState>()((set, get) => ({
  ...initialState,

  setStatus: (status) => set({ status }),

  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),

  // 스트리밍 중 청크 누적
  appendChunk: (chunk) =>
    set((state) => ({ currentChunk: state.currentChunk + chunk })),

  // 스트리밍 완료 → messages에 추가 후 currentChunk 초기화
  commitStream: () => {
    const { currentChunk, messages } = get();
    if (!currentChunk.trim()) return;

    const message: AIMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: currentChunk,
      createdAt: new Date(),
    };
    set({ messages: [...messages, message], currentChunk: '' });
  },

  setError: (error) => set({ error, status: 'error' }),

  clearMessages: () => set({ messages: [], currentChunk: '' }),

  reset: () => set(initialState),
}));
