# 데이터 흐름 & 상태 관리

## 전체 데이터 흐름

```mermaid
sequenceDiagram
    actor User as 사용자
    participant Chat as AIChat
    participant Hook as useAIStream
    participant Store as useAIStore (Zustand)
    participant Adapter as AIAdapter
    participant API as AI API (SSE)

    User->>Chat: 메시지 입력 후 전송
    Chat->>Hook: send("안녕?")

    Hook->>Store: addMessage({ role: 'user', content: '안녕?' })
    Hook->>Store: setStatus('thinking')
    Hook->>Adapter: stream(messages)
    Adapter->>API: POST /api/chat (SSE 요청)

    API-->>Adapter: data: {"chunk":"안"}
    Adapter-->>Hook: yield "안"
    Hook->>Store: appendChunk("안")
    Store-->>Chat: currentChunk = "안" → 리렌더링

    API-->>Adapter: data: {"chunk":"녕하세요!"}
    Adapter-->>Hook: yield "녕하세요!"
    Hook->>Store: appendChunk("녕하세요!")
    Store-->>Chat: currentChunk = "안녕하세요!" → 리렌더링

    API-->>Adapter: data: [DONE]
    Hook->>Store: commitStream()
    Note over Store: currentChunk → messages에 assistant 메시지 추가\ncurrentChunk = ''
    Hook->>Store: setStatus('idle')
    Store-->>Chat: messages 업데이트 → 리렌더링
```

---

## Zustand 상태 구조

```mermaid
stateDiagram-v2
    [*] --> idle : 초기화

    idle --> thinking : send() 호출
    thinking --> streaming : adapter.stream() 시작
    streaming --> idle : 스트리밍 완료 (commitStream)
    streaming --> error : 에러 발생
    thinking --> error : 에러 발생
    error --> thinking : 재시도 (retry)
    idle --> idle : clearMessages()
```

### 상태별 데이터

| status | messages | currentChunk | error |
|--------|----------|--------------|-------|
| `idle` | 완성된 메시지 목록 | `''` | `null` |
| `thinking` | user 메시지 추가됨 | `''` | `null` |
| `streaming` | user 메시지 추가됨 | 실시간 누적 중 | `null` |
| `error` | user 메시지 추가됨 | `''` (클리어) | `AIError` |

### 스토어 액션

```typescript
// useAIStore 액션 목록
setStatus(status)       // 상태 전환
addMessage(message)     // 메시지 배열에 추가
appendChunk(chunk)      // currentChunk에 문자열 누적
clearCurrentChunk()     // currentChunk = ''
commitStream()          // currentChunk → assistant 메시지로 확정
setError(error)         // 에러 저장 + currentChunk 클리어
clearMessages()         // 대화 초기화
reset()                 // 전체 초기 상태로 복귀
```

---

## useAIStream 내부 흐름

```mermaid
flowchart TD
    A([send 호출]) --> B[user 메시지 추가\nstatus = thinking]
    B --> C[attempt 시작]

    C --> D{timeout\n설정됨?}
    D -->|Yes| E[setTimeout 등록\n→ timedOut=true, abort 호출]
    D -->|No| F[status = streaming\ncurrentChunk 클리어]
    E --> F

    F --> G[adapter.stream 순회\nfor await chunk]
    G --> H[appendChunk 호출]
    H --> G

    G -->|스트리밍 완료| I[commitStream\nstatus = idle]
    I --> Z([완료])

    G -->|에러 발생| J{AbortError?}

    J -->|No, retriesLeft > 0| K[attempt 재귀 호출\nretriesLeft - 1]
    K --> C

    J -->|No, retriesLeft = 0| L[code = NETWORK]
    J -->|Yes, timedOut = true| M[code = TIMEOUT]
    J -->|Yes, timedOut = false| N[code = ABORTED]

    L --> O[setError 호출]
    M --> O
    N --> O
    O --> Z2([에러 종료])
```

---

## 메시지 가상화 흐름

`@tanstack/react-virtual`을 사용해 DOM에는 **현재 보이는 항목만** 렌더링합니다.

```mermaid
flowchart LR
    subgraph Data["데이터 (메모리)"]
        M1[msg 1]
        M2[msg 2]
        Dots1["..."]
        M499[msg 499]
        M500[msg 500]
        M501[msg 501]
        Dots2["..."]
        M1000[msg 1000]
    end

    subgraph Virtual["useVirtualizer (계산)"]
        Calc["스크롤 위치 기준\n보이는 범위 계산"]
    end

    subgraph DOM["실제 DOM (렌더링)"]
        D498[msg 498]
        D499[msg 499]
        D500[msg 500]
        D501[msg 501]
        D502[msg 502]
    end

    Data --> Virtual
    Virtual --> DOM

    style DOM fill:#d4f1d4
    style Data fill:#f1f1d4
```

### 가상화 구현 핵심

```typescript
// 1. 렌더링할 아이템 배열 구성 (메시지 + 상태 아이템)
const virtualItems = useMemo<VirtualItem[]>(() => {
  const items = messages.map(message => ({ kind: 'message', message }));
  if (status === 'thinking') items.push({ kind: 'thinking' });
  if (status === 'streaming') items.push({ kind: 'streaming', content: currentChunk });
  if (error) items.push({ kind: 'error', message: error.message });
  return items;
}, [messages, status, currentChunk, error]);

// 2. 가상화 설정
const virtualizer = useVirtualizer({
  count: virtualItems.length,
  getScrollElement: () => scrollRef.current,
  estimateSize: () => 60,        // 예상 행 높이 (px)
  overscan: 5,                   // 뷰포트 밖 여유 렌더링 수
});

// 3. 새 메시지 추가 시 자동 스크롤
useEffect(() => {
  if (virtualItems.length > 0) {
    virtualizer.scrollToIndex(virtualItems.length - 1, { behavior: 'smooth' });
  }
}, [virtualItems.length]);
```

---

## 에러 코드 분류

| code | 발생 조건 | 재시도 가능 |
|------|-----------|-------------|
| `NETWORK` | HTTP 오류, 파싱 실패 등 | ✅ maxRetries 소진 전까지 |
| `TIMEOUT` | timeout 옵션 초과 | ❌ |
| `ABORTED` | 사용자가 직접 abort() | ❌ |
| `UNKNOWN` | 기타 예상 밖 에러 | ❌ |