# @imjeonmutoe/ai-components

AI 스트리밍 응답을 위한 React 컴포넌트 라이브러리.
SSE(Server-Sent Events) 기반의 실시간 스트리밍 UI를 어댑터 패턴으로 추상화합니다.

## 특징

- **어댑터 패턴** — Anthropic, OpenAI 등 어떤 AI API도 `AIAdapter` 인터페이스만 구현하면 연결 가능
- **실시간 스트리밍** — SSE 청크를 받아 타이핑 애니메이션으로 표시
- **프로덕션 레디** — timeout, retry, unmount abort, ARIA 접근성 내장
- **메시지 가상화** — `@tanstack/react-virtual` 기반, 수천 개 메시지도 일정한 성능
- **듀얼 빌드** — ESM / CJS 동시 지원

## 설치

```bash
npm install @imjeonmutoe/ai-components
```

## 빠른 시작

```tsx
import { AIChat } from '@imjeonmutoe/ai-components';
import '@imjeonmutoe/ai-components/dist/index.css'; // Tailwind 스타일 (선택)

// 1. AIAdapter 구현
const myAdapter = {
  async *stream(messages) {
    const res = await fetch('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ messages }),
    });
    const reader = res.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const text = decoder.decode(value);
      // data: {"chunk":"..."} 형식 파싱
      for (const line of text.split('\n')) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();
          if (data === '[DONE]') return;
          yield JSON.parse(data).chunk;
        }
      }
    }
  },
  abort() { /* AbortController.abort() */ },
};

// 2. 컴포넌트에 전달
export default function App() {
  return <AIChat adapter={myAdapter} title="AI 어시스턴트" />;
}
```

## 패키지 구조

```
ai-component-library/
├── packages/
│   ├── ai-components/        # 핵심 라이브러리 (npm 배포)
│   └── tailwind-config/      # Tailwind 설정 공유
├── apps/
│   ├── demo/                 # Next.js 15 데모앱
│   └── api/                  # FastAPI SSE 스트리밍 서버
└── docs/                     # 프로젝트 문서
```

## 주요 명령어

```bash
pnpm dev            # 전체 개발 서버
pnpm test           # Vitest 전체 실행
pnpm storybook      # Storybook 실행
pnpm build          # 전체 빌드
pnpm type-check     # 타입 검사
```

## 문서

- [아키텍처 개요](./docs/architecture.md)
- [데이터 흐름 & 상태 관리](./docs/data-flow.md)
- [API 레퍼런스](./docs/api-reference.md)
- [Storybook](https://imjeonmutoe.github.io/ai-component-library)

## 기술 스택

| 분류 | 기술 |
|------|------|
| UI | React 19 + TypeScript 5 |
| 상태관리 | Zustand v5 |
| 스타일 | Tailwind CSS v3 |
| 가상화 | @tanstack/react-virtual |
| 테스트 | Vitest + RTL + MSW |
| 문서화 | Storybook v8 |
| 빌드 | tsup (ESM + CJS) |
| CI/CD | GitHub Actions |

## 라이선스

MIT