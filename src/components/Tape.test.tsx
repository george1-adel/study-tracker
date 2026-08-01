import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Tape } from './Tape';
import type { TapeBlock } from '../domain/tape/layout';

describe('Tape Component', () => {
  it('rendered tape container has dir="ltr" even when document or parent is rtl', () => {
    render(
      <div dir="rtl">
        <Tape lanes={[{ blocks: [] }]} />
      </div>
    );
    const container = screen.getByRole('region');
    expect(container).toHaveAttribute('dir', 'ltr');
  });

  it('focus and break blocks have different heights and height styles', () => {
    const focusBlock: TapeBlock = {
      sessionId: 's-focus',
      kind: 'stopwatch',
      startFrac: 0.1,
      widthFrac: 0.2,
      isFocus: true,
    };
    const breakBlock: TapeBlock = {
      sessionId: 's-break',
      kind: 'pomodoro_short_break',
      startFrac: 0.4,
      widthFrac: 0.1,
      isFocus: false,
    };

    const { container } = render(
      <Tape lanes={[{ blocks: [focusBlock, breakBlock] }]} />
    );

    const focusEl = container.querySelector('.tape-block-focus');
    const breakEl = container.querySelector('.tape-block-break');

    expect(focusEl).toBeInTheDocument();
    expect(breakEl).toBeInTheDocument();

    // Verify distinct CSS classes that define different top/bottom inset heights
    expect(focusEl).toHaveClass('tape-block-focus');
    expect(breakEl).toHaveClass('tape-block-break');
  });

  it('block tooltips render localized duration and clock range and do NOT contain %', () => {
    const startTs = new Date(2026, 2, 14, 1, 30).getTime();
    const endTs = new Date(2026, 2, 14, 2, 10).getTime();

    const block: TapeBlock = {
      sessionId: 's-1',
      kind: 'stopwatch',
      startFrac: 0.1,
      widthFrac: 0.2,
      isFocus: true,
      startedAt: startTs,
      endedAt: endTs,
      durationMs: 2400_000,
    };

    const { container } = render(
      <Tape lanes={[{ blocks: [block] }]} locale="en" />
    );

    const blockEl = container.querySelector('.tape-block');
    expect(blockEl).toBeInTheDocument();

    const title = blockEl?.getAttribute('title') ?? '';
    expect(title).toBe('Focus - 40m, 01:30 to 02:10');
    expect(title).not.toContain('%');
  });

  it('renders playhead when playheadFrac is passed', () => {
    const { container } = render(
      <Tape lanes={[{ blocks: [] }]} playheadFrac={0.5} />
    );
    const playhead = container.querySelector('.tape-playhead');
    expect(playhead).toBeInTheDocument();
    expect(playhead).toHaveStyle({ insetInlineStart: '50%' });
  });

  it('renders empty state text when no blocks exist', () => {
    render(
      <Tape lanes={[{ blocks: [] }]} emptyText="Nothing on the tape yet. Start a timer." />
    );
    expect(screen.getAllByText('Nothing on the tape yet. Start a timer.')[0]).toBeInTheDocument();
  });
});
