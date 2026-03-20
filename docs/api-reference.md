# API 레퍼런스

## 타입

### `AIAdapter`

라이브러리와 AI 프로바이더를 연결하는 핵심 인터페이스. 사용자가 직접 구현합니다.

```typescript
interface AIAdapter {
  /** 메시지를 받아 응답 청크를 순차적으로 yield */
  stream(messages: AIMessage[]): AsyncIterable<string>;
  /** 진행 중인 스트리밍 중단 */
  abort(): void;
}
```

### `AIMessage`

```typescript
interface AIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: Date;
}
```

### `AIStatus`

```typescript
type AIStatus = 'idle' | 'thinking' | 'streaming' | 'error';
```

### `AIError`

```typescript
interface AIError {
  code: 'NETWORK' | 'TIMEOUT' | 'ABORTED' | 'UNKNOWN';
  message: string;
}
```

---

## 컴포넌트

### `<AIChat />`

완성형 채팅 UI 컴포넌트. 메시지 목록, 입력창, 스트리밍 표시를 모두 포함합니다.

```typescript
interface AIChatProps {
  /** AI 응답을 처리할 어댑터 (필수) */
  adapter: AIAdapter;
  /** 입력창 placeholder (기본값: '메시지를 입력하세요...') */
  placeholder?: string;
  /** 루트 엘리먼트에 추가할 className */
  className?: string;
  /** 헤더에 표시할 타이틀 (기본값: 'AI 어시스턴트') */
  title?: string;
  /** 실패 시 재시도 횟수 (기본값: 0) */
  maxRetries?: number;
  /** 스트리밍 타임아웃 ms. 초과 시 TIMEOUT 에러 */
  timeout?: number;
}
```

**사용 예시**

```tsx
import { AIChat } from '@imjeonmutoe/ai-components';

<AIChat
  adapter={myAdapter}
  title="고객 지원 AI"
  placeholder="무엇이든 물어보세요..."
  maxRetries={2}
  timeout={30000}
  className="h-[600px] w-[400px]"
/>
```

**접근성**

- 메시지 목록: `role="log"`, `aria-live="polite"`, `aria-busy`
- 입력창: `<label>` 연결, `aria-disabled`, `aria-describedby`
- 전송 버튼: `aria-label`, `aria-busy`
- 로딩 인디케이터: `role="status"`
- 에러: `role="alert"`

---

### `<AIStreamText />`

단일 prompt에 대한 응답을 인라인으로 스트리밍 표시합니다.
마운트 시 자동으로 `send(prompt)`를 호출합니다.

```typescript
interface AIStreamTextProps {
  adapter: AIAdapter;
  /** 전송할 프롬프트 (마운트 시 자동 전송) */
  prompt: string;
  className?: string;
  /** 로딩 중 표시할 ReactNode */
  fallback?: ReactNode;
  /** 에러 시 표시할 ReactNode */
  errorFallback?: ReactNode;
  /** 스트리밍 완료 후 콜백 */
  onComplete?: (text: string) => void;
}
```

**사용 예시**

```tsx
import { AIStreamText } from '@imjeonmutoe/ai-components';

<p>
  오늘의 추천 메뉴:&nbsp;
  <AIStreamText
    adapter={myAdapter}
    prompt="오늘의 점심 메뉴 3가지를 한 줄로 추천해줘"
    fallback={<span>생각 중...</span>}
    onComplete={(text) => console.log('완료:', text)}
  />
</p>
```

---

### `<AIStatusBadge />`

`AIStatus`를 시각적 뱃지로 표시합니다.

```typescript
interface AIStatusBadgeProps {
  status: AIStatus;
  className?: string;
}
```

| status | 표시 텍스트 | 색상 |
|--------|-------------|------|
| `idle` | 대기 중 | 회색 |
| `thinking` | 생각 중 | 노란색 (pulse) |
| `streaming` | 응답 중 | 인디고 (pulse) |
| `error` | 오류 | 빨간색 |

**사용 예시**

```tsx
import { AIStatusBadge, useAIStream } from '@imjeonmutoe/ai-components';

function MyChat() {
  const { status, send } = useAIStream({ adapter });
  return (
    <div>
      <AIStatusBadge status={status} />
      {/* ... */}
    </div>
  );
}
```

---

## 훅

### `useAIStream(options)`

스트리밍 로직의 핵심 훅. 컴포넌트 언마운트 시 자동으로 `adapter.abort()`를 호출합니다.

```typescript
function useAIStream(options: {
  adapter: AIAdapter;
  maxRetries?: number; // 기본값: 0
  timeout?: number;    // ms 단위
}): {
  status: AIStatus;
  messages: AIMessage[];
  currentChunk: string;    // 스트리밍 중 실시간 누적 텍스트
  error: AIError | null;
  send: (content: string) => Promise<void>;
  abort: () => void;
  clearMessages: () => void;
}
```

**사용 예시 (커스텀 UI)**

```tsx
import { useAIStream } from '@imjeonmutoe/ai-components';

function CustomChat() {
  const { status, messages, currentChunk, error, send } = useAIStream({
    adapter: myAdapter,
    maxRetries: 3,
    timeout: 10000,
  });

  return (
    <div>
      {messages.map(msg => (
        <div key={msg.id}>{msg.content}</div>
      ))}
      {status === 'streaming' && <div>{currentChunk}</div>}
      {error && <div>에러: {error.message}</div>}
      <button onClick={() => send('안녕?')}>전송</button>
    </div>
  );
}
```

---

### `useAIStore` (고급)

Zustand 스토어에 직접 접근합니다. 여러 컴포넌트에서 동일한 대화 상태를 공유할 때 사용합니다.

```typescript
const store = useAIStore();

// 상태 읽기
store.status         // AIStatus
store.messages       // AIMessage[]
store.currentChunk   // string
store.error          // AIError | null

// 액션
store.addMessage(message)
store.appendChunk(chunk)
store.commitStream()
store.setError(error)
store.clearMessages()
store.reset()
```

---

## 어댑터 구현 가이드

### Anthropic (Claude)

```typescript
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const anthropicAdapter: AIAdapter = {
  async *stream(messages) {
    const stream = await client.messages.stream({
      model: 'claude-opus-4-6',
      max_tokens: 1024,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        yield event.delta.text;
      }
    }
  },
  abort() {
    // SDK 내부 처리
  },
};
```

### Fetch + SSE (직접 구현)

```typescript
const fetchAdapter: AIAdapter = {
  controller: null as AbortController | null,

  async *stream(messages) {
    this.controller = new AbortController();
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages }),
      signal: this.controller.signal,
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const reader = res.body!.getReader();
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
        yield (JSON.parse(data) as { chunk: string }).chunk;
      }
    }
  },

  abort() {
    this.controller?.abort();
  },
};
```

### 테스트용 Mock

```typescript
const mockAdapter: AIAdapter = {
  async *stream(messages) {
    const words = ['안녕하세요!', ' 무엇을', ' 도와드릴까요?'];
    for (const word of words) {
      await new Promise(r => setTimeout(r, 100));
      yield word;
    }
  },
  abort() {},
};
```