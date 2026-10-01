import type {
  ReportPriority,
  ReportStatus,
} from "@zam/capture/domain/value-objects/triage";
import { cn } from "@zam/ui/lib/utils";

import { PRIORITY_LABELS, STATUS_LABELS } from "../lib/triage-labels";

const GLYPH_SIZE = 14;
const GLYPH_RADIUS = 5.5;
const GLYPH_CENTER = 7;
const RING = 2 * Math.PI * GLYPH_RADIUS;

/** Workflow position as a filling ring: empty → half → full (citrus) → muted full. */
export const TriageStatusGlyph = ({
  className,
  status,
}: {
  className?: string;
  status: ReportStatus;
}) => {
  const fill: Record<ReportStatus, number> = {
    closed: 1,
    in_progress: 0.5,
    open: 0,
    resolved: 1,
  };
  return (
    <svg
      aria-hidden
      className={cn(
        "shrink-0",
        // Resolved keeps the ink ring and fills citrus; citrus alone has too little contrast on the warm canvas.
        status === "closed" && "text-muted-foreground",
        className
      )}
      height={GLYPH_SIZE}
      viewBox={`0 0 ${GLYPH_SIZE} ${GLYPH_SIZE}`}
      width={GLYPH_SIZE}
    >
      <circle
        cx={GLYPH_CENTER}
        cy={GLYPH_CENTER}
        fill="none"
        r={GLYPH_RADIUS}
        stroke="currentColor"
        strokeDasharray={status === "open" ? "2 2" : undefined}
        strokeWidth="1.5"
      />
      {fill[status] > 0 ? (
        <circle
          cx={GLYPH_CENTER}
          cy={GLYPH_CENTER}
          fill="none"
          r={GLYPH_RADIUS / 2}
          stroke={status === "resolved" ? "var(--brand)" : "currentColor"}
          strokeDasharray={`${(RING / 2) * fill[status]} ${RING}`}
          strokeWidth={GLYPH_RADIUS}
          transform={`rotate(-90 ${GLYPH_CENTER} ${GLYPH_CENTER})`}
        />
      ) : null}
    </svg>
  );
};

export const TriageStatusLabel = ({ status }: { status: ReportStatus }) => (
  <span className="inline-flex items-center gap-1.5 text-xs">
    <TriageStatusGlyph status={status} />
    {STATUS_LABELS[status]}
  </span>
);

const PRIORITY_BARS: Record<ReportPriority, number> = {
  high: 3,
  low: 1,
  medium: 2,
  none: 0,
  urgent: 3,
};
const BAR_COUNT = 3;

/** Signal-strength bars; urgent switches to a destructive "!" so it reads at a glance. */
export const PriorityMark = ({ priority }: { priority: ReportPriority }) => {
  const label = `Priority: ${PRIORITY_LABELS[priority]}`;
  return (
    <span className="inline-flex" title={label}>
      <span className="sr-only">{label}</span>
      {priority === "urgent" ? (
        <span
          aria-hidden
          className="bg-destructive inline-flex size-3.5 items-center justify-center rounded-[4px] font-mono text-[10px] leading-none font-bold text-white"
        >
          !
        </span>
      ) : (
        <span aria-hidden className="inline-flex h-3.5 items-end gap-[2px]">
          {Array.from({ length: BAR_COUNT }, (_, index) => (
            <span
              className={cn(
                "w-[3px] rounded-[1px]",
                index < PRIORITY_BARS[priority]
                  ? "bg-foreground"
                  : "bg-foreground/15"
              )}
              // Bars are positional, 1..3.
              // oxlint-disable-next-line react/no-array-index-key
              key={index}
              style={{ height: `${((index + 1) / BAR_COUNT) * 100}%` }}
            />
          ))}
        </span>
      )}
    </span>
  );
};
