import { useCallback, useEffect } from 'react';
import { useAIStore } from '../store/useAIStore';
import type { AIAdapter, AIMessage, AIError } from '../types';

interface UseAIStreamOptions {
  adapter: AIAdapter;
  /** 실패 시 재시도 횟수 (기본값: 0) */
  maxRetries?: number;
  /** 스트리밍 타임아웃 (ms). 초과 시 TIMEOUT 에러 */
  timeout?: number;
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

export function useAIStream({
  adapter,
  maxRetries = 0,
  timeout,
}: UseAIStreamOptions): UseAIStreamReturn {
  const store = useAIStore();

  // 컴포넌트 언마운트 시 진행 중인 스트림 정리 (메모리 누수 방지)
  useEffect(() => {
    return () => {
      adapter.abort();
    };
  }, [adapter]);

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

      const messages = [...useAIStore.getState().messages];

      const attempt = async (retriesLeft: number): Promise<void> => {
        let timedOut = false;
        let timeoutId: ReturnType<typeof setTimeout> | undefined;

        try {
          store.setStatus('streaming');
          store.clearCurrentChunk();

          if (timeout !== undefined) {
            timeoutId = setTimeout(() => {
              timedOut = true;
              adapter.abort();
            }, timeout);
          }

          for await (const chunk of adapter.stream(messages)) {
            store.appendChunk(chunk);
          }

          store.commitStream();
          store.setStatus('idle');
        } catch (err) {
          const isAbortError = err instanceof Error && err.name === 'AbortError';

          // 재시도 가능한 에러 (abort/timeout 제외)
          if (!isAbortError && retriesLeft > 0) {
            await attempt(retriesLeft - 1);
            return;
          }

          const code: AIError['code'] = timedOut
            ? 'TIMEOUT'
            : isAbortError
              ? 'ABORTED'
              : 'NETWORK';

          store.setError({
            code,
            message: err instanceof Error ? err.message : 'Unknown error',
          });
        } finally {
          clearTimeout(timeoutId);
        }
      };

      await attempt(maxRetries);
    },
    [adapter, store, maxRetries, timeout]
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