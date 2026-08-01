import type { TapeBlock } from '../domain/tape/layout';
import { formatBlockTooltip } from '../domain/tape/layout';
import type { Language } from '../i18n';
import { TapeScale } from './TapeScale';

export interface TapeLane {
  dayKey?: string;
  blocks: TapeBlock[];
}

export interface TapeProps {
  zoom?: 'day' | 'month' | 'year';
  lanes: TapeLane[];
  now?: number;
  playheadFrac?: number | null;
  ariaSummary?: string;
  emptyText?: string;
  locale?: Language;
  className?: string;
}

export function Tape({
  zoom = 'day',
  lanes,
  playheadFrac,
  ariaSummary,
  emptyText = 'Nothing on the tape yet. Start a timer.',
  locale = 'en',
  className = '',
}: TapeProps) {
  const hasBlocks = lanes.some((lane) => lane.blocks.length > 0);
  const showPlayhead =
    typeof playheadFrac === 'number' &&
    !Number.isNaN(playheadFrac) &&
    playheadFrac >= 0 &&
    playheadFrac <= 1;

  return (
    <div
      className={`tape-container tape-zoom-${zoom} ${className}`}
      dir="ltr"
      aria-label={ariaSummary}
      role="region"
    >
      <TapeScale zoom={zoom} />
      <div className="tape-bed">
        {/* Background grid rules matching ticks */}
        <div className="tape-grid" aria-hidden="true">
          {[0, 3, 6, 9, 12, 15, 18, 21, 24].map((hour) => (
            <div
              key={hour}
              className={`tape-grid-line ${hour % 6 !== 0 ? 'tape-grid-line-3h' : ''}`}
              style={{ insetInlineStart: `${(hour / 24) * 100}%` }}
            />
          ))}
        </div>

        {/* Lanes & Blocks */}
        <div className="tape-lanes">
          {lanes.map((lane, index) => (
            <div key={lane.dayKey || index} className="tape-lane">
              {lane.blocks.map((block, bIndex) => {
                const blockClass = block.isFocus
                  ? 'tape-block tape-block-focus'
                  : 'tape-block tape-block-break';

                const tooltipTitle =
                  block.tooltip ??
                  (block.startedAt !== undefined && block.endedAt !== undefined
                    ? formatBlockTooltip(block.kind, block.startedAt, block.endedAt, locale)
                    : undefined);

                return (
                  <div
                    key={block.sessionId || bIndex}
                    className={blockClass}
                    style={{
                      insetInlineStart: `${block.startFrac * 100}%`,
                      width: `${block.widthFrac * 100}%`,
                    }}
                    title={tooltipTitle}
                  />
                );
              })}
            </div>
          ))}
        </div>

        {/* Playhead */}
        {showPlayhead && (
          <div
            className="tape-playhead"
            style={{ insetInlineStart: `${playheadFrac! * 100}%` }}
            aria-hidden="true"
          >
            <div className="tape-playhead-cap" />
          </div>
        )}

        {/* Empty state message */}
        {!hasBlocks && (
          <div className="tape-empty-message">
            {emptyText}
          </div>
        )}
      </div>

      {ariaSummary && <span className="sr-only">{ariaSummary}</span>}
    </div>
  );
}
