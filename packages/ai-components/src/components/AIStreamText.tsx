'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import type { AIAdapter } from '../types';
import { useAIStream } from '../hooks/useAIStream';

interface AIStreamTextProps {
  adapter: AIAdapter;
  prompt: string;
  className?: string;
  fallback?: ReactNode;
  errorFallback?: ReactNode;
  onComplete?: (text: string) => void;
}

export function AIStreamText({
  adapter,
  prompt,
  className = '',
  fallback,
  errorFallback,
  onComplete,
}: AIStreamTextProps) {
  const { status, messages, currentChunk, error, send } = useAIStream({ adapter });
  const sentRef = useRef(false);

  useEffect(() => {
    if (sentRef.current) return;
    sentRef.current = true;
    void send(prompt);
  }, []);

  const assistantMsg = messages.find((m) => m.role === 'assistant');

  useEffect(() => {
    if (assistantMsg && onComplete) {
      onComplete(assistantMsg.content);
    }
  }, [assistantMsg?.id]);

  if (error) {
    return <>{errorFallback ?? <span className="text-red-500">{error.message}</span>}</>;
  }

  if (status === 'thinking' || (status === 'streaming' && !currentChunk && !assistantMsg)) {
    return <>{fallback ?? null}</>;
  }

  const text = assistantMsg?.content ?? currentChunk;

  return (
    <span className={className}>
      {text}
      {status === 'streaming' && (
        <span className="inline-block w-0.5 h-[1em] ml-0.5 bg-current align-text-bottom animate-cursor-blink" />
      )}
    </span>
  );
}