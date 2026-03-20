# 아키텍처 개요

## 모노레포 구조

```
ai-component-library/
├── packages/
│   ├── ai-components/        ← npm 배포 대상 (핵심 라이브러리)
│   └── tailwind-config/      ← Tailwind 프리셋 공유
├── apps/
│   ├── demo/                 ← Next.js 15 쇼케이스 앱
│   └── api/                  ← FastAPI SSE 스트리밍 서버
└── docs/                     ← 문서
```

pnpm workspace + Turborepo로 패키지 간 빌드 캐시 및 의존성을 관리합니다.

---

## 레이어 구조

```mermaid
graph TD
    subgraph Consumer["사용하는 쪽 (앱)"]
        App["앱 코드"]
    end

    subgraph Library["@imjeonmutoe/ai-components"]
        subgraph Components["UI 컴포넌트"]
            AIChat["AIChat\n(채팅 전체 UI)"]
            AIStreamText["AIStreamText\n(인라인 스트리밍 텍스트)"]
            AIStatusBadge["AIStatusBadge\n(상태 뱃지)"]
        end

        subgraph Hook["훅"]
            useAIStream["useAIStream\n(스트리밍 로직)"]
        end

        subgraph Store["상태"]
            useAIStore["useAIStore\n(Zustand)"]
        end

        subgraph Types["인터페이스"]
            AIAdapter["AIAdapter\n(어댑터 계약)"]
        end
    end

    subgraph Adapters["어댑터 (사용자 구현)"]
        AnthropicAdapter["AnthropicAdapter"]
        OpenAIAdapter["OpenAIAdapter"]
        CustomAdapter["CustomAdapter"]
    end

    subgraph API["외부 AI API"]
        Anthropic["Anthropic API"]
        OpenAI["OpenAI API"]
        Custom["직접 구축한 서버"]
    end

    App --> AIChat
    App --> AIStreamText
    App --> AIStatusBadge
    App --> useAIStream

    AIChat --> useAIStream
    AIStreamText --> useAIStream

    useAIStream --> useAIStore
    useAIStream --> AIAdapter

    AIAdapter -.->|구현| AnthropicAdapter
    AIAdapter -.->|구현| OpenAIAdapter
    AIAdapter -.->|구현| CustomAdapter

    AnthropicAdapter --> Anthropic
    OpenAIAdapter --> OpenAI
    CustomAdapter --> Custom
```

---

## 어댑터 패턴

라이브러리는 어떤 AI 프로바이더를 사용하는지 **알지 못합니다**.
`AIAdapter` 인터페이스만 만족하면 어떤 구현이든 연결할 수 있습니다.

```mermaid
classDiagram
    class AIAdapter {
        <<interface>>
        +stream(messages: AIMessage[]) AsyncIterable~string~
        +abort() void
    }

    class AnthropicAdapter {
        -controller: AbortController
        +stream(messages) AsyncIterable~string~
        +abort() void
    }

    class MockAdapter {
        +stream(messages) AsyncIterable~string~
        +abort() void
    }

    AIAdapter <|.. AnthropicAdapter : implements
    AIAdapter <|.. MockAdapter : implements

    class AIChat {
        +adapter: AIAdapter
    }

    class useAIStream {
        +adapter: AIAdapter
    }

    AIChat --> useAIStream
    useAIStream --> AIAdapter
```

### 어댑터 구현 예시

```typescript
// 어댑터가 지켜야 할 계약 (라이브러리 정의)
interface AIAdapter {
  stream(messages: AIMessage[]): AsyncIterable<string>;
  abort(): void;
}

// 사용자가 자신의 AI API에 맞게 구현
const anthropicAdapter: AIAdapter = {
  async *stream(messages) {
    const controller = new AbortController();
    const res = await fetch('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ messages }),
      signal: controller.signal,
    });

    for await (const chunk of parseSSE(res.body)) {
      yield chunk; // 문자열 청크를 하나씩 yield
    }
  },
  abort() {
    controller.abort();
  },
};
```

---

## 빌드 파이프라인

```mermaid
graph LR
    subgraph Source["소스"]
        TS["TypeScript\n(.ts, .tsx)"]
    end

    subgraph Build["tsup 빌드"]
        ESM["dist/index.js\n(ESM)"]
        CJS["dist/index.cjs\n(CJS)"]
        DTS["dist/index.d.ts\n(타입)"]
    end

    subgraph CI["GitHub Actions"]
        TypeCheck["type-check"]
        Test["test (Vitest)"]
        BuildCI["build"]
    end

    subgraph Publish["배포"]
        NPM["npm\n@imjeonmutoe/ai-components"]
        SB["Storybook\nGitHub Pages"]
    end

    TS --> Build
    Build --> CI
    CI -->|태그 push| NPM
    CI -->|main push| SB
```

---

## 파일 구조 (ai-components)

```
packages/ai-components/src/
├── index.ts                    ← 공개 API 진입점
├── types/
│   └── index.ts                ← AIAdapter, AIMessage, AIError, AIStatus
├── store/
│   └── useAIStore.ts           ← Zustand 전역 상태
├── hooks/
│   ├── useAIStream.ts          ← 핵심 스트리밍 훅
│   └── __tests__/
│       └── useAIStream.test.ts
├── components/
│   ├── AIChat.tsx
│   ├── AIStreamText.tsx
│   ├── AIStatusBadge.tsx
│   ├── AIChat.stories.tsx
│   ├── AIStreamText.stories.tsx
│   ├── AIStatusBadge.stories.tsx
│   └── __tests__/
│       ├── AIStreamText.test.tsx
│       └── AIStatusBadge.test.tsx
└── test/
    ├── setup.ts
    └── mocks/
        ├── server.ts           ← MSW 서버 설정
        └── handlers.ts         ← SSE 스트리밍 Mock 핸들러
```