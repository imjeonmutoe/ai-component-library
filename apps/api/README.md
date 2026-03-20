# AI API Server

FastAPI 기반 SSE 스트리밍 서버입니다.

## 시작하기

```bash
# 가상환경 생성
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate

# 의존성 설치
pip install -r requirements.txt

# 개발 서버 시작
uvicorn src.api.main:app --reload --port 8000
```

## Anthropic API 연결

1. `.env.example`을 복사해서 `.env` 파일 생성:
   ```bash
   cp .env.example .env
   ```

2. `.env` 파일에서 설정:
   ```
   AI_PROVIDER=anthropic
   ANTHROPIC_API_KEY=sk-ant-your-key-here
   ANTHROPIC_MODEL=claude-haiku-4-5-20251001
   ```

3. 서버 재시작:
   ```bash
   uvicorn src.api.main:app --reload --port 8000
   ```

API 키 없이 테스트하려면 `AI_PROVIDER=mock` (기본값)으로 유지하세요.

## API

- `GET /health` — 헬스체크
- `POST /api/stream` — SSE 스트리밍 응답

### POST /api/stream 요청 형식

```json
{
  "messages": [
    { "role": "user", "content": "안녕하세요" }
  ]
}
```

### 응답 (SSE)

```
data: {"chunk": "안녕"}
data: {"chunk": "하세요"}
data: [DONE]
```