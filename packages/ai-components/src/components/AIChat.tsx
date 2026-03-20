'use client';

import { useState, useRef, useEffect, useMemo, type FormEvent } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { AIAdapter, AIMessage } from '../types';
import { useAIStream } from '../hooks/useAIStream';

interface AIChatProps {
  adapter: AIAdapter;
  placeholder?: string;
  className?: string;
  title?: string;
  maxRetries?: number;
  timeout?: number;
}

type VirtualItem =
  | { kind: 'message'; message: AIMessage }
  | { kind: 'thinking' }
  | { kind: 'streaming'; content: string }
  | { kind: 'error'; message: string };

function MessageBubble({ message }: { message: AIMessage }) {
  const isUser = message.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        role="article"
        aria-label={`${isUser ? '사용자' : 'AI'} 메시지`}
        className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm leading-relaxed ${
          isUser
            ? 'bg-ai-primary text-white rounded-br-sm'
            : 'bg-white border border-ai-border text-gray-800 rounded-bl-sm shadow-sm'
        }`}
      >
        {message.content}
      </div>
    </div>
  );
}

function StreamingBubble({ content }: { content: string }) {
  return (
    <div className="flex justify-start">
      <div
        role="article"
        aria-label="AI 응답 중"
        aria-live="polite"
        className="max-w-[80%] rounded-2xl rounded-bl-sm px-4 py-2 text-sm leading-relaxed bg-white border border-ai-border text-gray-800 shadow-sm"
      >
        {content}
        <span
          aria-hidden="true"
          className="inline-block w-0.5 h-4 ml-0.5 bg-ai-primary align-text-bottom animate-cursor-blink"
        />
      </div>
    </div>
  );
}

function ThinkingIndicator() {
  return (
    <div className="flex justify-start" role="status" aria-label="AI가 생각 중입니다">
      <div className="rounded-2xl rounded-bl-sm px-4 py-3 bg-white border border-ai-border shadow-sm flex gap-1 items-center">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            aria-hidden="true"
            className="w-1.5 h-1.5 rounded-full bg-ai-primary animate-dot-bounce"
            style={{ animationDelay: `${i * 0.2}s` }}
          />
        ))}
      </div>
    </div>
  );
}

function renderVirtualItem(item: VirtualItem) {
  switch (item.kind) {
    case 'message':
      return <MessageBubble message={item.message} />;
    case 'thinking':
      return <ThinkingIndicator />;
    case 'streaming':
      return <StreamingBubble content={item.content} />;
    case 'error':
      return (
        <div role="alert" className="text-center text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">
          오류가 발생했습니다: {item.message}
        </div>
      );
  }
}

export function AIChat({
  adapter,
  placeholder = '메시지를 입력하세요...',
  className = '',
  title = 'AI 어시스턴트',
  maxRetries,
  timeout,
}: AIChatProps) {
  const { status, messages, currentChunk, error, send, clearMessages } =
    useAIStream({ adapter, maxRetries, timeout });
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const isLoading = status === 'thinking' || status === 'streaming';

  const virtualItems = useMemo<VirtualItem[]>(() => {
    const items: VirtualItem[] = messages.map((message) => ({ kind: 'message', message }));
    if (status === 'thinking') items.push({ kind: 'thinking' });
    if (status === 'streaming' && currentChunk) items.push({ kind: 'streaming', content: currentChunk });
    if (error) items.push({ kind: 'error', message: error.message });
    return items;
  }, [messages, status, currentChunk, error]);

  const virtualizer = useVirtualizer({
    count: virtualItems.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 60,
    overscan: 5,
  });

  // Auto-scroll to bottom on new items
  useEffect(() => {
    if (virtualItems.length > 0) {
      virtualizer.scrollToIndex(virtualItems.length - 1, { behavior: 'smooth' });
    }
  }, [virtualItems.length, virtualizer]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;
    setInput('');
    inputRef.current?.focus();
    await send(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSubmit(e as unknown as FormEvent);
    }
  };

  return (
    <div
      className={`flex flex-col bg-ai-surface rounded-2xl border border-ai-border overflow-hidden shadow-lg ${className}`}
    >
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-ai-border bg-white">
        <div className="flex items-center gap-2">
          <span aria-hidden="true" className="text-lg">✦</span>
          <h2 className="font-semibold text-gray-800 text-sm">{title}</h2>
        </div>
        {messages.length > 0 && (
          <button
            onClick={clearMessages}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="대화 내용 초기화"
          >
            초기화
          </button>
        )}
      </header>

      {/* Messages */}
      <div
        ref={scrollRef}
        role="log"
        aria-label="채팅 메시지 목록"
        aria-live="polite"
        aria-busy={isLoading}
        className="flex-1 overflow-y-auto min-h-0"
      >
        {virtualItems.length === 0 && status === 'idle' ? (
          <div
            aria-label="대화를 시작하세요"
            className="flex flex-col items-center justify-center h-full text-center text-gray-400 py-12"
          >
            <span aria-hidden="true" className="text-3xl mb-3">✦</span>
            <p className="text-sm">무엇이든 물어보세요</p>
          </div>
        ) : (
          <div
            style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}
            className="p-4"
          >
            {virtualizer.getVirtualItems().map((vItem) => {
              const item = virtualItems[vItem.index];
              if (!item) return null;
              return (
                <div
                  key={vItem.key}
                  data-index={vItem.index}
                  ref={virtualizer.measureElement}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    transform: `translateY(${vItem.start}px)`,
                    padding: '6px 0',
                  }}
                >
                  {renderVirtualItem(item)}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        aria-label="메시지 입력"
        className="border-t border-ai-border bg-white p-3 flex gap-2 items-end"
      >
        <label htmlFor="ai-chat-input" className="sr-only">
          메시지 입력
        </label>
        <textarea
          id="ai-chat-input"
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isLoading}
          rows={1}
          aria-disabled={isLoading}
          aria-describedby={error ? 'ai-chat-error' : undefined}
          className="flex-1 resize-none rounded-xl border border-ai-border px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-ai-primary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        />
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          aria-label={isLoading ? 'AI가 응답 중입니다' : '메시지 전송'}
          aria-busy={isLoading}
          className="rounded-xl bg-ai-primary hover:bg-ai-primary-hover disabled:opacity-40 disabled:cursor-not-allowed text-white px-4 py-2 text-sm font-medium transition-colors shrink-0"
        >
          전송
        </button>
      </form>
    </div>
  );
}