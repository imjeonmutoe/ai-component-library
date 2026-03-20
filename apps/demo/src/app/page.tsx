'use client';

import { AIChat } from '@ai-lib/components';
import { createFetchAdapter } from '@/lib/fetchAdapter';
import { useMemo } from 'react';

export default function HomePage() {
  const adapter = useMemo(() => createFetchAdapter(), []);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl flex flex-col gap-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            ✦ AI Component Library
          </h1>
          <p className="text-gray-500 text-sm">
            AI-first React 컴포넌트 라이브러리 데모
          </p>
        </div>

        <div className="h-[600px] flex">
          <AIChat
            adapter={adapter}
            title="AI 어시스턴트"
            placeholder="무엇이든 물어보세요... (Shift+Enter로 줄바꿈)"
            className="flex-1"
          />
        </div>

        <p className="text-center text-xs text-gray-400">
          FastAPI SSE 서버(<code className="bg-gray-100 px-1 rounded">localhost:8000</code>)에 연결됩니다
        </p>
      </div>
    </main>
  );
}