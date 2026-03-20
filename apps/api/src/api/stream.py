import asyncio
import os
from collections.abc import AsyncIterator

from dotenv import load_dotenv

from .models import Message

load_dotenv()

_PROVIDER = os.getenv("AI_PROVIDER", "mock").lower()
_ANTHROPIC_MODEL = os.getenv("ANTHROPIC_MODEL", "claude-haiku-4-5-20251001")
_MOCK_DELAY = float(os.getenv("MOCK_DELAY", "0.08"))

MOCK_RESPONSES = [
    "안녕하세요! 저는 AI 어시스턴트입니다. 무엇을 도와드릴까요?",
    "좋은 질문이에요. 제가 아는 한에서 최선을 다해 답변드리겠습니다.",
    "흥미로운 주제네요! 더 자세히 설명해 드릴까요?",
    "물론이죠! 단계별로 설명해 드리겠습니다.",
]


async def _mock_stream(messages: list[Message]) -> AsyncIterator[str]:
    import hashlib

    last_user = next((m for m in reversed(messages) if m.role == "user"), None)
    idx = 0
    if last_user:
        idx = int(hashlib.md5(last_user.content.encode()).hexdigest(), 16) % len(MOCK_RESPONSES)

    response = MOCK_RESPONSES[idx]
    for i, word in enumerate(response.split(" ")):
        chunk = word if i == 0 else f" {word}"
        yield chunk
        await asyncio.sleep(_MOCK_DELAY)


async def _anthropic_stream(messages: list[Message]) -> AsyncIterator[str]:
    import anthropic

    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise ValueError("ANTHROPIC_API_KEY가 설정되지 않았습니다")

    client = anthropic.AsyncAnthropic(api_key=api_key)

    system_msgs = [m.content for m in messages if m.role == "system"]
    chat_msgs = [
        {"role": m.role, "content": m.content}
        for m in messages
        if m.role != "system"
    ]
    system_prompt = "\n".join(system_msgs) if system_msgs else "You are a helpful assistant."

    async with client.messages.stream(
        model=_ANTHROPIC_MODEL,
        max_tokens=2048,
        system=system_prompt,
        messages=chat_msgs,
    ) as stream:
        async for text in stream.text_stream:
            yield text


async def generate_stream(messages: list[Message]) -> AsyncIterator[str]:
    """
    메시지를 받아 스트리밍으로 응답을 생성합니다.

    AI_PROVIDER 환경변수로 provider를 선택합니다:
    - "anthropic" : Anthropic Claude API 사용
    - "mock"      : 로컬 Mock 응답 사용 (기본값)
    """
    if _PROVIDER == "anthropic":
        async for chunk in _anthropic_stream(messages):
            yield chunk
    else:
        async for chunk in _mock_stream(messages):
            yield chunk