import { Slider } from "@zam/ui/components/slider";
import { cn } from "@zam/ui/lib/utils";
import { useRef } from "react";
import type { PointerEvent } from "react";

import type { TimeRange } from "../model/cut-ranges";
import type {
  TimelineMarker,
  TimelineMarkerKind,
} from "../model/timeline-markers";

const SELECTION_STEP_MS = 100;
const MS_PER_SECOND = 1000;
/** Label steps; the smallest that keeps at most MAX_TICKS labels wins, so labels never collide. */
const TICK_STEPS_S = [1, 2, 5, 10, 15, 30, 60];
const MAX_TICKS = 12;
const SECONDS_PER_MINUTE = 60;
/** Drags shorter than this are clicks (seek), not selections. */
const MIN_DRAG_MS = 200;

const percentOf = (ms: number, durationMs: number): string =>
  `${(Math.min(Math.max(ms, 0), durationMs) / durationMs) * 100}%`;

const tickLabel = (seconds: number): string =>
  `${Math.floor(seconds / SECONDS_PER_MINUTE)}:${String(seconds % SECONDS_PER_MINUTE).padStart(2, "0")}`;

const ticksFor = (durationMs: number): number[] => {
  const durationS = durationMs / MS_PER_SECOND;
  const step =
    TICK_STEPS_S.find((candidate) => durationS / candidate <= MAX_TICKS) ??
    SECONDS_PER_MINUTE;
  return Array.from(
    { length: Math.floor(durationS / step) + 1 },
    (_, index) => index * step
  );
};

const MARKER_CLASS: Record<TimelineMarkerKind, string> = {
  click: "bg-foreground/50 h-2",
  error: "bg-destructive h-3",
  failed: "bg-destructive/60 h-3",
};

interface CutTimelineProps {
  durationMs: number;
  cuts: readonly TimeRange[];
  markers: readonly TimelineMarker[];
  playheadMs: number;
  /** `null` until the reporter marks a range (I/O keys, drag on the track). */
  selection: readonly [number, number] | null;
  onSeek: (atMs: number) => void;
  /** Called with the new selection and the edge that moved, so the preview can seek to it. */
  onSelectionChange: (selection: [number, number], movedMs: number) => void;
}

/**
 * Evidence-aware cut timeline: markers show where errors, failed requests and
 * clicks happened; cut ranges are hatched; the selection is citrus. Click to
 * seek, drag to select; the slider below fine-tunes a selection by keyboard.
 */
export const CutTimeline = ({
  cuts,
  durationMs,
  markers,
  onSeek,
  onSelectionChange,
  playheadMs,
  selection,
}: CutTimelineProps) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragFromMs = useRef<number | null>(null);

  const msAt = (event: PointerEvent): number => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) {
      return 0;
    }
    const ratio = Math.min(
      Math.max((event.clientX - rect.left) / rect.width, 0),
      1
    );
    return (
      Math.round((ratio * durationMs) / SELECTION_STEP_MS) * SELECTION_STEP_MS
    );
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Pointer shortcut for seeking and selecting; the slider below and the I/O keys are the accessible path. */}
      <div
        aria-hidden="true"
        className="relative cursor-crosshair touch-none select-none"
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          dragFromMs.current = msAt(event);
        }}
        onPointerMove={(event) => {
          const fromMs = dragFromMs.current;
          if (fromMs === null) {
            return;
          }
          const toMs = msAt(event);
          if (Math.abs(toMs - fromMs) >= MIN_DRAG_MS) {
            onSelectionChange(
              [Math.min(fromMs, toMs), Math.max(fromMs, toMs)],
              toMs
            );
          }
        }}
        onPointerUp={(event) => {
          const fromMs = dragFromMs.current;
          dragFromMs.current = null;
          if (fromMs !== null && Math.abs(msAt(event) - fromMs) < MIN_DRAG_MS) {
            onSeek(fromMs);
          }
        }}
        ref={trackRef}
      >
        <div className="relative h-4">
          {markers.map((marker, index) => (
            <span
              className={cn(
                "absolute bottom-0 w-[2px] -translate-x-1/2 rounded-full",
                MARKER_CLASS[marker.kind]
              )}
              // Markers are positional and may share a timestamp.
              // oxlint-disable-next-line react/no-array-index-key
              key={`${marker.kind}-${marker.atMs}-${index}`}
              style={{ left: percentOf(marker.atMs, durationMs) }}
            />
          ))}
        </div>
        <div className="bg-card ring-border relative h-12 overflow-hidden rounded-xl ring-1">
          {cuts.map((cut) => (
            <div
              className="bg-foreground/10 absolute inset-y-0 bg-[repeating-linear-gradient(135deg,transparent_0_6px,var(--foreground)_6px_7px)] opacity-60"
              key={`${cut.startMs}-${cut.endMs}`}
              style={{
                left: percentOf(cut.startMs, durationMs),
                width: percentOf(cut.endMs - cut.startMs, durationMs),
              }}
            />
          ))}
          {selection ? (
            <div
              className="bg-brand/70 ring-foreground/40 absolute inset-y-0 ring-1 ring-inset"
              style={{
                left: percentOf(selection[0], durationMs),
                width: percentOf(selection[1] - selection[0], durationMs),
              }}
            />
          ) : null}
          <div
            className="bg-foreground absolute inset-y-0 w-[2px] -translate-x-1/2"
            style={{ left: percentOf(playheadMs, durationMs) }}
          />
        </div>
        <div className="text-muted-foreground relative mt-1 h-4 font-mono text-[10px] tabular-nums">
          {ticksFor(durationMs).map((seconds) => (
            <span
              className="absolute -translate-x-1/2 first:translate-x-0"
              key={seconds}
              style={{ left: percentOf(seconds * MS_PER_SECOND, durationMs) }}
            >
              {tickLabel(seconds)}
            </span>
          ))}
        </div>
      </div>
      {selection ? (
        <Slider
          aria-label="Selection to cut"
          max={durationMs}
          min={0}
          minStepsBetweenValues={1}
          onValueChange={(value, details) => {
            if (!Array.isArray(value)) {
              return;
            }
            const [start = 0, end = durationMs] = value;
            onSelectionChange(
              [start, end],
              details.activeThumbIndex === 0 ? start : end
            );
          }}
          step={SELECTION_STEP_MS}
          value={[...selection]}
        />
      ) : null}
    </div>
  );
};
