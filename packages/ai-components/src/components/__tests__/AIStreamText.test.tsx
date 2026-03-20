import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { server } from '../../test/mocks/server';
import { streamHandler, errorHandler } from '../../test/mocks/handlers';
import { AIStreamText } from '../AIStreamText';
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
    abort() { controller?.abort(); },
  };
};

describe('AIStreamText', () => {
  beforeEach(() => {
    useAIStore.getState().reset();
  });

  it('마운트 시 자동으로 스트리밍을 시작한다', async () => {
    server.use(streamHandler(['안녕', '하세요', '!']));
    const adapter = createFetchAdapter();

    render(<AIStreamText adapter={adapter} prompt="안녕?" />);

    await waitFor(() => {
      expect(screen.getByText(/안녕하세요!/)).toBeInTheDocument();
    });
  });

  it('로딩 중 fallback을 보여준다', async () => {
    server.use(streamHandler(['응답']));
    const adapter = createFetchAdapter();

    render(
      <AIStreamText adapter={adapter} prompt="테스트" fallback={<span>로딩중...</span>} />
    );

    expect(screen.getByText('로딩중...')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByText('로딩중...')).not.toBeInTheDocument();
    });
  });

  it('에러 시 errorFallback을 보여준다', async () => {
    server.use(errorHandler());
    const adapter = createFetchAdapter();

    render(
      <AIStreamText
        adapter={adapter}
        prompt="에러 테스트"
        errorFallback={<span>오류 발생</span>}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('오류 발생')).toBeInTheDocument();
    });
  });

  it('onComplete 콜백이 완성된 텍스트와 함께 호출된다', async () => {
    server.use(streamHandler(['완료텍스트']));
    const adapter = createFetchAdapter();
    const onComplete = vi.fn();

    render(<AIStreamText adapter={adapter} prompt="완료?" onComplete={onComplete} />);

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledWith('완료텍스트');
    });
  });
});