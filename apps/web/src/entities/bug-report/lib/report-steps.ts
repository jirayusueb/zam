import type { NetworkRequest } from "@zam/capture/domain/value-objects/devtools-snapshot";
import type { UserStep } from "@zam/capture/domain/value-objects/user-step";

import { isFailedRequest } from "./is-failed-request";

export type StepFilter = "all" | "navigation" | "networkError" | "activity";

export const STEP_FILTERS: readonly { label: string; value: StepFilter }[] = [
  { label: "All", value: "all" },
  { label: "Page navigation", value: "navigation" },
  { label: "Network errors", value: "networkError" },
  { label: "User activities", value: "activity" },
];

/** One Steps-panel row: the recording start, a reporter action, or a failed request. */
export interface TimelineRow {
  id: string;
  kind: "start" | UserStep["kind"] | "networkError";
  request: NetworkRequest | null;
  step: UserStep | null;
  timestamp: number;
}

/** Recording start, user steps, and failed requests, interleaved by time. */
export const timelineRows = (
  steps: readonly UserStep[],
  network: readonly NetworkRequest[],
  startedAt: Date
): TimelineRow[] =>
  [
    {
      id: "start",
      kind: "start" as const,
      request: null,
      step: null,
      timestamp: startedAt.getTime(),
    },
    ...steps.map((step, index) => ({
      id: `step-${index}`,
      kind: step.kind,
      request: null,
      step,
      timestamp: step.timestamp,
    })),
    ...network.filter(isFailedRequest).map((request, index) => ({
      id: `network-${index}`,
      kind: "networkError" as const,
      request,
      step: null,
      timestamp: request.timestamp,
    })),
  ].toSorted((a, b) => a.timestamp - b.timestamp);

export const matchesStepFilter = (
  row: TimelineRow,
  filter: StepFilter
): boolean => {
  if (filter === "all") {
    return true;
  }
  if (filter === "navigation") {
    return row.kind === "navigation";
  }
  if (filter === "networkError") {
    return row.kind === "networkError";
  }
  return row.kind === "click" || row.kind === "visibility";
};

/** Row count per filter, for the filter bar's badges. */
export const countByStepFilter = (
  rows: readonly TimelineRow[]
): Record<StepFilter, number> => {
  const counts: Record<StepFilter, number> = {
    activity: 0,
    all: rows.length,
    navigation: 0,
    networkError: 0,
  };
  for (const row of rows) {
    if (row.kind === "navigation") {
      counts.navigation += 1;
    } else if (row.kind === "networkError") {
      counts.networkError += 1;
    } else if (row.kind === "click" || row.kind === "visibility") {
      counts.activity += 1;
    }
  }
  return counts;
};
