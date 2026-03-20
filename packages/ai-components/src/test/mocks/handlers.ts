import { http, HttpResponse } from 'msw';

// SSE 스트리밍 응답 생성 헬퍼
const streamResponse = (chunks: string[]) => {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      chunks.forEach((chunk) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ chunk })}\n\n`)
        );
      });
      controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      controller.close();
    },
  });

  return new HttpResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
    },
  });
};

export const handlers = [
  // 정상 스트리밍
  http.post('/api/stream', () =>
    streamResponse(['안녕', '하세요', '!'])
  ),
];

// 테스트에서 개별적으로 사용할 핸들러 팩토리
export const streamHandler = (chunks: string[]) =>
  http.post('/api/stream', () => streamResponse(chunks));

export const errorHandler = () =>
  http.post('/api/stream', () =>
    HttpResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  );

export const networkErrorHandler = () =>
  http.post('/api/stream', () => HttpResponse.error());