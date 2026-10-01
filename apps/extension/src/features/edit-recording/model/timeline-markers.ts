import type {
  DevtoolsSnapshot,
  NetworkRequest,
} from "@zam/capture/domain/value-objects/devtools-snapshot";
import { isResourceTimingType } from "@zam/capture/domain/value-objects/devtools-snapshot";
import type { UserStep } from "@zam/capture/domain/value-objects/user-step";

export type TimelineMarkerKind = "error" | "failed" | "click";

export interface TimelineMarker {
  /** Milliseconds from the start of the recording. */
  atMs: number;
  kind: TimelineMarkerKind;
}

const ERROR_STATUS = 400;

/** Same rule as the report page: 4xx/5xx, or status 0 where 0 means "never completed". */
export const isFailedRequest = (request: NetworkRequest): boolean =>
  request.status >= ERROR_STATUS ||
  (request.status === 0 && !isResourceTimingType(request.type));

/** Where the evidence is, in recording time, so the reporter can see what a cut would remove. */
export const timelineMarkers = (
  devtools: DevtoolsSnapshot,
  steps: readonly UserStep[],
  startedAt: number
): TimelineMarker[] => [
  ...steps
    .filter((step) => step.kind === "click")
    .map((step) => ({
      atMs: step.timestamp - startedAt,
      kind: "click" as const,
    })),
  ...devtools.network.filter(isFailedRequest).map((request) => ({
    atMs: request.timestamp - startedAt,
    kind: "failed" as const,
  })),
  ...devtools.console
    .filter((entry) => entry.level === "error")
    .map((entry) => ({
      atMs: entry.timestamp - startedAt,
      kind: "error" as const,
    })),
];

/** Errors and failed requests in a snapshot; compared before/after cuts to warn about lost evidence. */
export const evidenceCounts = (devtools: DevtoolsSnapshot) => ({
  errors: devtools.console.filter((entry) => entry.level === "error").length,
  failed: devtools.network.filter(isFailedRequest).length,
});
