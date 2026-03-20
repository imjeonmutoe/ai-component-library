import type { Meta, StoryObj } from '@storybook/react';
import { AIStreamText } from './AIStreamText';
import type { AIAdapter, AIMessage } from '../types';

function createMockAdapter(response: string, delayMs = 80): AIAdapter {
  let aborted = false;
  return {
    async *stream(_: AIMessage[]) {
      aborted = false;
      const words = response.split(' ');
      for (let i = 0; i < words.length; i++) {
        if (aborted) return;
        await new Promise((r) => setTimeout(r, delayMs));
        yield (i === 0 ? '' : ' ') + words[i];
      }
    },
    abort() { aborted = true; },
  };
}

const meta: Meta<typeof AIStreamText> = {
  title: 'AI Components/AIStreamText',
  component: AIStreamText,
  parameters: { layout: 'centered' },
};

export default meta;
type Story = StoryObj<typeof AIStreamText>;

export const Default: Story = {
  args: {
    adapter: createMockAdapter('React 19는 새로운 훅과 향상된 동시성 기능을 제공합니다.'),
    prompt: 'React 19의 주요 특징은?',
    className: 'text-gray-800 text-lg',
  },
};

export const WithFallback: Story = {
  args: {
    adapter: createMockAdapter('응답이 도착했습니다!', 300),
    prompt: '느린 응답 테스트',
    fallback: <span className="text-gray-400 animate-pulse">생성 중...</span>,
    className: 'text-gray-800',
  },
};

export const InlineUsage: Story = {
  render: (args) => (
    <p className="text-gray-700 max-w-md">
      AI가 생성한 요약:{' '}
      <AIStreamText {...args} className="text-ai-primary font-medium" />
    </p>
  ),
  args: {
    adapter: createMockAdapter('이 라이브러리는 AI 스트리밍을 React 컴포넌트로 쉽게 통합합니다.'),
    prompt: '한 문장으로 요약해줘',
  },
};