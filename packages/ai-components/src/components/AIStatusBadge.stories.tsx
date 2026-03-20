import type { Meta, StoryObj } from '@storybook/react';
import { AIStatusBadge } from './AIStatusBadge';

const meta: Meta<typeof AIStatusBadge> = {
  title: 'AI Components/AIStatusBadge',
  component: AIStatusBadge,
  parameters: { layout: 'centered' },
};

export default meta;
type Story = StoryObj<typeof AIStatusBadge>;

export const Idle: Story = { args: { status: 'idle' } };
export const Thinking: Story = { args: { status: 'thinking' } };
export const Streaming: Story = { args: { status: 'streaming' } };
export const Error: Story = { args: { status: 'error' } };

export const AllStatuses: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      {(['idle', 'thinking', 'streaming', 'error'] as const).map((s) => (
        <AIStatusBadge key={s} status={s} />
      ))}
    </div>
  ),
};