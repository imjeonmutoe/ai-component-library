// ── AI 상태 ──────────────────────────────────
export type AIStatus = 'idle' | 'thinking' | 'streaming' | 'error';

// ── 메시지 ───────────────────────────────────
export type AIRole = 'user' | 'assistant' | 'system';

export interface AIMessage {
  id: string;
  role: AIRole;
  content: string;
  createdAt: Date;
}

// ── 에러 ─────────────────────────────────────
export interface AIError {
  code: 'NETWORK' | 'TIMEOUT' | 'ABORTED' | 'UNKNOWN';
  message: string;
}

// ── 어댑터 패턴 ──────────────────────────────
export interface AIAdapter {
  stream(messages: AIMessage[]): AsyncIterable<string>;
  abort(): void;
}

// ── Provider 설정 ────────────────────────────
export interface AIConfig {
  adapter: AIAdapter;
  model?: string;
  maxRetries?: number;
  timeout?: number;
}
