import { Slider } from "@zam/ui/components/slider";

import type { TimeRange } from "../model/cut-ranges";

const SELECTION_STEP_MS = 100;

const percentOf = (ms: number, durationMs: number): string =>
  `${(ms / durationMs) * 100}%`;

interface CutTimelineProps {
  durationMs: number;
  cuts: readonly TimeRange[];
  selection: readonly [number, number];
  /** Called with the new selection and the edge the reporter moved, so the preview can seek to it. */
  onSelectionChange: (selection: [number, number], movedMs: number) => void;
}

/** Cut ranges drawn over the recording, with a two-thumb slider selecting the next range to cut. */
export const CutTimeline = ({
  durationMs,
  cuts,
  selection,
  onSelectionChange,
}: CutTimelineProps) => (
  <div className="flex flex-col gap-3">
    {/* Decorative: the slider below and the cut list carry the same information accessibly. */}
    <div
      aria-hidden="true"
      className="bg-muted relative h-8 overflow-hidden rounded-md"
    >
      <div
        className="bg-primary/30 absolute inset-y-0"
        style={{
          left: percentOf(selection[0], durationMs),
          width: percentOf(selection[1] - selection[0], durationMs),
        }}
      />
      {cuts.map((cut) => (
        <div
          className="bg-destructive/70 absolute inset-y-0"
          key={`${cut.startMs}-${cut.endMs}`}
          style={{
            left: percentOf(cut.startMs, durationMs),
            width: percentOf(cut.endMs - cut.startMs, durationMs),
          }}
        />
      ))}
    </div>
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
  </div>
);
