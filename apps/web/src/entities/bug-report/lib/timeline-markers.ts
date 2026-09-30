import type { DevtoolsSnapshot } from "@zam/capture/domain/value-objects/devtools-snapshot";

import { isFailedRequest } from "./is-failed-request";

export interface TimelineMarker {
  /** Offset from the start of the recording, in ms. */
  at: number;
  kind: "error" | "warn" | "failed";
  label: string;
}

/** Console errors/warnings and failed requests, pinned at their offset and sorted by time. */
export const timelineMarkers = (
  devtools: DevtoolsSnapshot,
  startedAt: Date
): TimelineMarker[] => {
  const start = startedAt.getTime();
  return [
    ...devtools.console
      .filter((entry) => entry.level === "error" || entry.level === "warn")
      .map((entry) => ({
        at: entry.timestamp - start,
        kind: entry.level === "error" ? ("error" as const) : ("warn" as const),
        label: entry.message,
      })),
    ...devtools.network.filter(isFailedRequest).map((request) => ({
      at: request.timestamp - start,
      kind: "failed" as const,
      label: `${request.method} ${request.status === 0 ? "failed" : request.status} ${request.url}`,
    })),
  ].toSorted((a, b) => a.at - b.at);
};

/** Errors and failed requests only: what "next error" jumps between. */
export const isProblemMarker = (marker: TimelineMarker): boolean =>
  marker.kind !== "warn";
