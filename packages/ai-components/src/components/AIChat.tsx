'use client';

import { useState, useRef, useEffect, type FormEvent } from 'react';
import type { AIAdapter, AIMessage } from '../types';
import { useAIStream } from '../hooks/useAIStream';

interface AIChatProps {
  adapter: AIAdapter;
  placeholder?: string;
  className?: string;
  title?: string;
}

function MessageBubble({ message }: { message: AIMessage }) {
  const isUser = message.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
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
      <div className="max-w-[80%] rounded-2xl rounded-bl-sm px-4 py-2 text-sm leading-relaxed bg-white border border-ai-border text-gray-800 shadow-sm">
        {content}
        <span className="inline-block w-0.5 h-4 ml-0.5 bg-ai-primary align-text-bottom animate-cursor-blink" />
      </div>
    </div>
  );
}

function ThinkingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="rounded-2xl rounded-bl-sm px-4 py-3 bg-white border border-ai-border shadow-sm flex gap-1 items-center">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-ai-primary animate-dot-bounce"
            style={{ animationDelay: `${i * 0.2}s` }}
          />
        ))}
      </div>
    </div>
  );
}

export function AIChat({
  adapter,
  placeholder = '메시지를 입력하세요...',
  className = '',
  title = 'AI 어시스턴트',
}: AIChatProps) {
  const { status, messages, currentChunk, error, send, clearMessages } =
    useAIStream({ adapter });
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const isLoading = status === 'thinking' || status === 'streaming';

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentChunk, status]);

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
          <span className="text-lg">✦</span>
          <h2 className="font-semibold text-gray-800 text-sm">{title}</h2>
        </div>
        {messages.length > 0 && (
          <button
            onClick={clearMessages}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="대화 초기화"
          >
            초기화
          </button>
        )}
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
        {messages.length === 0 && status === 'idle' && (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 py-12">
            <span className="text-3xl mb-3">✦</span>
            <p className="text-sm">무엇이든 물어보세요</p>
          </div>
        )}

        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {status === 'thinking' && <ThinkingIndicator />}
        {status === 'streaming' && currentChunk && (
          <StreamingBubble content={currentChunk} />
        )}

        {error && (
          <div className="text-center text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">
            오류가 발생했습니다: {error.message}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="border-t border-ai-border bg-white p-3 flex gap-2 items-end"
      >
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isLoading}
          rows={1}
          className="flex-1 resize-none rounded-xl border border-ai-border px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-ai-primary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        />
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="rounded-xl bg-ai-primary hover:bg-ai-primary-hover disabled:opacity-40 disabled:cursor-not-allowed text-white px-4 py-2 text-sm font-medium transition-colors shrink-0"
        >
          전송
        </button>
      </form>
    </div>
  );
}
