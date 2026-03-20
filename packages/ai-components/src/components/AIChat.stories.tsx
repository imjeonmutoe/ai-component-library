import type { Meta, StoryObj } from '@storybook/react';
import { AIChat } from './AIChat';
import type { AIAdapter, AIMessage } from '../types';

// 스트리밍을 시뮬레이션하는 Mock 어댑터
function createMockAdapter(
  responses: string[],
  options: { delayMs?: number; errorAfter?: number } = {}
): AIAdapter {
  const { delayMs = 80, errorAfter } = options;
  let aborted = false;

  return {
    async *stream(_messages: AIMessage[]) {
      aborted = false;
      const response = responses[Math.floor(Math.random() * responses.length)] ?? '응답입니다.';
      const words = response.split(' ');

      for (let i = 0; i < words.length; i++) {
        if (aborted) return;
        if (errorAfter !== undefined && i >= errorAfter) {
          throw new Error('스트리밍 중 오류가 발생했습니다');
        }
        await new Promise((r) => setTimeout(r, delayMs));
        yield (i === 0 ? '' : ' ') + words[i];
      }
    },
    abort() {
      aborted = true;
    },
  };
}

const meta: Meta<typeof AIChat> = {
  title: 'AI Components/AIChat',
  component: AIChat,
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div style={{ width: '400px', height: '600px', display: 'flex' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof AIChat>;

export const Default: Story = {
  args: {
    adapter: createMockAdapter([
      '안녕하세요! 저는 AI 어시스턴트입니다. 무엇을 도와드릴까요?',
      '물론이죠! 자세히 설명해 드리겠습니다.',
      '좋은 질문입니다. 이에 대한 답변을 드리겠습니다.',
    ]),
    title: 'AI 어시스턴트',
    placeholder: '메시지를 입력하세요...',
  },
};

export const FastStreaming: Story = {
  args: {
    adapter: createMockAdapter(
      ['빠른 응답입니다. 스트리밍 속도가 빠른 경우를 시뮬레이션합니다.'],
      { delayMs: 20 }
    ),
    title: '빠른 응답',
  },
};

export const SlowStreaming: Story = {
  args: {
    adapter: createMockAdapter(
      ['느린 응답입니다. 네트워크가 느리거나 모델이 천천히 응답하는 상황을 시뮬레이션합니다.'],
      { delayMs: 300 }
    ),
    title: '느린 응답',
  },
};

export const WithError: Story = {
  args: {
    adapter: createMockAdapter(['이 응답은 중간에 오류가 발생합니다.'], {
      errorAfter: 3,
    }),
    title: '에러 상황',
  },
};
