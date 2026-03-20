import { useCallback } from 'react';
import { useAIStore } from '../store/useAIStore';
import type { AIAdapter, AIMessage, AIError } from '../types';

interface UseAIStreamOptions {
  adapter: AIAdapter;
}

interface UseAIStreamReturn {
  status: ReturnType<typeof useAIStore.getState>['status'];
  messages: AIMessage[];
  currentChunk: string;
  error: AIError | null;
  send: (content: string) => Promise<void>;
  abort: () => void;
  clearMessages: () => void;
}

export function useAIStream({ adapter }: UseAIStreamOptions): UseAIStreamReturn {
  const store = useAIStore();

  const send = useCallback(
    async (content: string) => {
      const userMessage: AIMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content,
        createdAt: new Date(),
      };

      store.addMessage(userMessage);
      store.setStatus('thinking');

      try {
        const messages = [...useAIStore.getState().messages];

        store.setStatus('streaming');

        for await (const chunk of adapter.stream(messages)) {
          store.appendChunk(chunk);
        }

        store.commitStream();
        store.setStatus('idle');
      } catch (err) {
        const isAbort =
          err instanceof Error && err.name === 'AbortError';

        const aiError: AIError = {
          code: isAbort ? 'ABORTED' : 'NETWORK',
          message: err instanceof Error ? err.message : 'Unknown error',
        };

        store.setError(aiError);
      }
    },
    [adapter, store]
  );

  const abort = useCallback(() => {
    adapter.abort();
  }, [adapter]);

  return {
    status: store.status,
    messages: store.messages,
    currentChunk: store.currentChunk,
    error: store.error,
    send,
    abort,
    clearMessages: store.clearMessages,
  };
}