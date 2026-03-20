import type { AIAdapter, AIMessage } from '@ai-lib/components';

interface FetchAdapterOptions {
  url?: string;
}

export function createFetchAdapter(options: FetchAdapterOptions = {}): AIAdapter {
  const { url = 'http://localhost:8000/api/stream' } = options;
  let abortController: AbortController | null = null;

  return {
    async *stream(messages: AIMessage[]) {
      abortController = new AbortController();

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages }),
        signal: abortController.signal,
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      if (!res.body) return;

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      try {
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
      } finally {
        reader.releaseLock();
      }
    },

    abort() {
      abortController?.abort();
    },
  };
}