import type { DevtoolsSnapshot } from "@zam/capture/domain/value-objects/devtools-snapshot";

/** Milliseconds from the start of the recording. */
export interface TimeRange {
  startMs: number;
  endMs: number;
}

/** A range of the original recording that survives the cuts, and where it starts in the edited video. */
export interface KeptSegment extends TimeRange {
  outputStartMs: number;
}

/** Complement of `cuts` within [0, durationMs]; overlapping and out-of-bounds cuts are merged and clamped. */
export const keptSegments = (
  durationMs: number,
  cuts: readonly TimeRange[]
): KeptSegment[] => {
  const sorted = cuts
    .map(({ startMs, endMs }) => ({
      endMs: Math.min(durationMs, endMs),
      startMs: Math.max(0, startMs),
    }))
    .filter((cut) => cut.endMs > cut.startMs)
    .toSorted((a, b) => a.startMs - b.startMs);

  const segments: KeptSegment[] = [];
  let cursorMs = 0;
  let outputMs = 0;
  for (const cut of sorted) {
    if (cut.startMs > cursorMs) {
      segments.push({
        endMs: cut.startMs,
        outputStartMs: outputMs,
        startMs: cursorMs,
      });
      outputMs += cut.startMs - cursorMs;
    }
    cursorMs = Math.max(cursorMs, cut.endMs);
  }
  if (durationMs > cursorMs) {
    segments.push({
      endMs: durationMs,
      outputStartMs: outputMs,
      startMs: cursorMs,
    });
  }
  return segments;
};

export const keptDurationMs = (segments: readonly KeptSegment[]): number =>
  segments.reduce((total, { startMs, endMs }) => total + endMs - startMs, 0);

/** Maps an absolute timestamp onto the edited video's clock; null when it falls inside a cut. */
const toEditedTimestamp = (
  timestamp: number,
  startedAt: number,
  segments: readonly KeptSegment[]
): number | null => {
  const offsetMs = timestamp - startedAt;
  const segment = segments.find(
    ({ startMs, endMs }) => offsetMs >= startMs && offsetMs <= endMs
  );
  return segment
    ? startedAt + segment.outputStartMs + offsetMs - segment.startMs
    : null;
};

const retime = <T extends { timestamp: number }>(
  entries: readonly T[],
  startedAt: number,
  segments: readonly KeptSegment[]
): T[] =>
  entries.flatMap((entry) => {
    const timestamp = toEditedTimestamp(entry.timestamp, startedAt, segments);
    return timestamp === null ? [] : [{ ...entry, timestamp }];
  });

/** Drops devtools entries recorded during cuts and shifts the rest so they stay in sync with the edited video. */
export const cutDevtools = (
  devtools: DevtoolsSnapshot,
  startedAt: number,
  segments: readonly KeptSegment[]
): DevtoolsSnapshot => ({
  console: retime(devtools.console, startedAt, segments),
  network: retime(devtools.network, startedAt, segments),
});

/** Same as `cutDevtools` for user steps. */
export const cutSteps = <T extends { timestamp: number }>(
  steps: readonly T[],
  startedAt: number,
  segments: readonly KeptSegment[]
): T[] => retime(steps, startedAt, segments);
