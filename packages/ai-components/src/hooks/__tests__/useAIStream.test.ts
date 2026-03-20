import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { server } from '../../test/mocks/server';
import {
  streamHandler,
  errorHandler,
  networkErrorHandler,
  failThenSucceedHandler,
} from '../../test/mocks/handlers';
import { useAIStream } from '../useAIStream';
import { useAIStore } from '../../store/useAIStore';

const createFetchAdapter = () => {
  let controller: AbortController | null = null;

  return {
    async *stream(messages: { role: string; content: string }[]) {
      controller = new AbortController();
      const res = await fetch('/api/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages }),
        signal: controller.signal,
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      if (!res.body) return;

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') return;
          const parsed = JSON.parse(data) as { chunk: string };
          yield parsed.chunk;
        }
      }
    },
    abort() {
      controller?.abort();
    },
  };
};

describe('useAIStream', () => {
  beforeEach(() => {
    useAIStore.getState().reset();
  });

  it('초기 상태는 idle이어야 한다', () => {
    const adapter = createFetchAdapter();
    const { result } = renderHook(() => useAIStream({ adapter }));

    expect(result.current.status).toBe('idle');
    expect(result.current.messages).toHaveLength(0);
    expect(result.current.error).toBeNull();
  });

  it('send 호출 시 사용자 메시지가 추가되어야 한다', async () => {
    server.use(streamHandler(['안녕', '하세요']));
    const adapter = createFetchAdapter();
    const { result } = renderHook(() => useAIStream({ adapter }));

    await act(async () => {
      await result.current.send('안녕?');
    });

    expect(result.current.messages[0]).toMatchObject({
      role: 'user',
      content: '안녕?',
    });
  });

  it('스트리밍 완료 후 assistant 메시지가 추가되어야 한다', async () => {
    server.use(streamHandler(['안녕', '하세요', '!']));
    const adapter = createFetchAdapter();
    const { result } = renderHook(() => useAIStream({ adapter }));

    await act(async () => {
      await result.current.send('안녕?');
    });

    await waitFor(() => {
      expect(result.current.status).toBe('idle');
    });

    const assistantMsg = result.current.messages.find((m) => m.role === 'assistant');
    expect(assistantMsg?.content).toBe('안녕하세요!');
  });

  it('스트리밍 중 status가 streaming이어야 한다', async () => {
    const statuses: string[] = [];
    server.use(streamHandler(['Hello']));
    const adapter = createFetchAdapter();

    const { result } = renderHook(() => {
      const hook = useAIStream({ adapter });
      statuses.push(hook.status);
      return hook;
    });

    await act(async () => {
      await result.current.send('Hi');
    });

    expect(statuses).toContain('streaming');
  });

  it('HTTP 에러 시 status가 error가 되어야 한다', async () => {
    server.use(errorHandler());
    const adapter = createFetchAdapter();
    const { result } = renderHook(() => useAIStream({ adapter }));

    await act(async () => {
      await result.current.send('안녕?').catch(() => {});
    });

    await waitFor(() => {
      expect(result.current.status).toBe('error');
    });

    expect(result.current.error).not.toBeNull();
    expect(result.current.error?.code).toBe('NETWORK');
  });

  it('네트워크 에러 시 status가 error가 되어야 한다', async () => {
    server.use(networkErrorHandler());
    const adapter = createFetchAdapter();
    const { result } = renderHook(() => useAIStream({ adapter }));

    await act(async () => {
      await result.current.send('안녕?').catch(() => {});
    });

    await waitFor(() => {
      expect(result.current.status).toBe('error');
    });
  });

  it('clearMessages 호출 시 메시지가 초기화되어야 한다', async () => {
    server.use(streamHandler(['응답']));
    const adapter = createFetchAdapter();
    const { result } = renderHook(() => useAIStream({ adapter }));

    await act(async () => {
      await result.current.send('안녕?');
    });

    act(() => {
      result.current.clearMessages();
    });

    expect(result.current.messages).toHaveLength(0);
  });

  it('언마운트 시 adapter.abort()를 호출한다', () => {
    const adapter = createFetchAdapter();
    const abortSpy = vi.spyOn(adapter, 'abort');

    const { unmount } = renderHook(() => useAIStream({ adapter }));
    unmount();

    expect(abortSpy).toHaveBeenCalled();
  });

  it('maxRetries 설정 시 실패 후 재시도하여 성공한다', async () => {
    server.use(failThenSucceedHandler(1, ['재시도', '성공']));
    const adapter = createFetchAdapter();
    const { result } = renderHook(() => useAIStream({ adapter, maxRetries: 1 }));

    await act(async () => {
      await result.current.send('안녕?');
    });

    await waitFor(() => {
      expect(result.current.status).toBe('idle');
    });

    const assistantMsg = result.current.messages.find((m) => m.role === 'assistant');
    expect(assistantMsg?.content).toBe('재시도성공');
  });

  it('timeout 초과 시 TIMEOUT 에러가 발생한다', async () => {
    let abortController: AbortController | null = null;
    const slowAdapter = {
      async *stream() {
        abortController = new AbortController();
        yield '첫번째청크';
        // abort 신호를 받을 때까지 대기
        await new Promise<void>((_, reject) => {
          abortController!.signal.addEventListener('abort', () => {
            reject(new DOMException('Aborted', 'AbortError'));
          });
        });
      },
      abort() {
        abortController?.abort();
      },
    };

    const { result } = renderHook(() =>
      useAIStream({ adapter: slowAdapter, timeout: 50 })
    );

    await act(async () => {
      await result.current.send('안녕?').catch(() => {});
    });

    await waitFor(
      () => {
        expect(result.current.status).toBe('error');
        expect(result.current.error?.code).toBe('TIMEOUT');
      },
      { timeout: 1000 }
    );
  });
});