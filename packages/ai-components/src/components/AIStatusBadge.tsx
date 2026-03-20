import type { AIStatus } from '../types';

interface AIStatusBadgeProps {
  status: AIStatus;
  className?: string;
}

const STATUS_CONFIG: Record<AIStatus, { label: string; dot: string; bg: string; text: string }> = {
  idle:      { label: '대기 중', dot: 'bg-gray-400',                   bg: 'bg-gray-100',  text: 'text-gray-600' },
  thinking:  { label: '생각 중', dot: 'bg-yellow-400 animate-pulse',   bg: 'bg-yellow-50', text: 'text-yellow-700' },
  streaming: { label: '응답 중', dot: 'bg-ai-primary animate-pulse',   bg: 'bg-indigo-50', text: 'text-indigo-700' },
  error:     { label: '오류',    dot: 'bg-red-500',                    bg: 'bg-red-50',    text: 'text-red-700' },
};

export function AIStatusBadge({ status, className = '' }: AIStatusBadgeProps) {
  const config = STATUS_CONFIG[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${config.bg} ${config.text} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}