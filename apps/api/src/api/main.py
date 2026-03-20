import json
from collections.abc import AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sse_starlette.sse import EventSourceResponse

from .models import StreamRequest
from .stream import generate_stream

app = FastAPI(title="AI Component Library API", version="0.0.1")

# CORS — Next.js 개발 서버 허용
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:6006"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health() -> dict[str, str]:
    import os
    return {
        "status": "ok",
        "provider": os.getenv("AI_PROVIDER", "mock"),
    }


@app.post("/api/stream")
async def stream_chat(body: StreamRequest) -> EventSourceResponse:
    async def event_generator() -> AsyncIterator[dict[str, str]]:
        async for chunk in generate_stream(body.messages):
            yield {"data": json.dumps({"chunk": chunk})}
        yield {"data": "[DONE]"}

    return EventSourceResponse(event_generator())