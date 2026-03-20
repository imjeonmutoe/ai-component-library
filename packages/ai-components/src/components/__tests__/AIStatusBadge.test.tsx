import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AIStatusBadge } from '../AIStatusBadge';

describe('AIStatusBadge', () => {
  it('idle 상태를 표시한다', () => {
    render(<AIStatusBadge status="idle" />);
    expect(screen.getByText('대기 중')).toBeInTheDocument();
  });

  it('thinking 상태를 표시한다', () => {
    render(<AIStatusBadge status="thinking" />);
    expect(screen.getByText('생각 중')).toBeInTheDocument();
  });

  it('streaming 상태를 표시한다', () => {
    render(<AIStatusBadge status="streaming" />);
    expect(screen.getByText('응답 중')).toBeInTheDocument();
  });

  it('error 상태를 표시한다', () => {
    render(<AIStatusBadge status="error" />);
    expect(screen.getByText('오류')).toBeInTheDocument();
  });

  it('커스텀 className이 적용된다', () => {
    const { container } = render(<AIStatusBadge status="idle" className="my-custom" />);
    expect(container.firstChild).toHaveClass('my-custom');
  });
});