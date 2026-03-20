import { http, HttpResponse } from 'msw';

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
  http.post('/api/stream', () =>
    streamResponse(['안녕', '하세요', '!'])
  ),
];

export const streamHandler = (chunks: string[]) =>
  http.post('/api/stream', () => streamResponse(chunks));

export const errorHandler = () =>
  http.post('/api/stream', () =>
    HttpResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  );

export const networkErrorHandler = () =>
  http.post('/api/stream', () => HttpResponse.error());

/** N번 실패 후 성공하는 핸들러 (retry 테스트용) */
export const failThenSucceedHandler = (failTimes: number, successChunks: string[]) => {
  let callCount = 0;
  return http.post('/api/stream', () => {
    callCount++;
    if (callCount <= failTimes) {
      return HttpResponse.json({ error: 'Server Error' }, { status: 500 });
    }
    return streamResponse(successChunks);
  });
};