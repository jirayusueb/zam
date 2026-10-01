import type {
  ConsoleEntry,
  NetworkRequest,
} from "@zam/capture/domain/value-objects/devtools-snapshot";

import { isFailedRequest } from "./is-failed-request";

export const CONSOLE_FILTER_VALUES = [
  "all",
  "info",
  "warn",
  "log",
  "error",
  "debug",
  "network",
] as const;
export type ConsoleFilter = (typeof CONSOLE_FILTER_VALUES)[number];

export const CONSOLE_FILTERS: readonly {
  label: string;
  value: ConsoleFilter;
}[] = [
  { label: "All", value: "all" },
  { label: "Info", value: "info" },
  { label: "Warning", value: "warn" },
  { label: "Log", value: "log" },
  { label: "Error", value: "error" },
  { label: "Debug", value: "debug" },
  { label: "Network", value: "network" },
];

/** One console-panel row: a logged message, or a failed network request shown Chrome-console style. */
export interface ConsoleRow {
  timestamp: number;
  entry: ConsoleEntry | null;
  request: NetworkRequest | null;
}

/** Console entries and failed network requests, interleaved by time. */
export const consoleRows = (
  entries: readonly ConsoleEntry[],
  network: readonly NetworkRequest[]
): ConsoleRow[] =>
  [
    ...entries.map((entry) => ({
      entry,
      request: null,
      timestamp: entry.timestamp,
    })),
    ...network.filter(isFailedRequest).map((request) => ({
      entry: null,
      request,
      timestamp: request.timestamp,
    })),
  ].toSorted((a, b) => a.timestamp - b.timestamp);

export const matchesConsoleFilter = (
  row: ConsoleRow,
  filter: ConsoleFilter
): boolean => {
  if (filter === "all") {
    return true;
  }
  if (filter === "network") {
    return row.request !== null;
  }
  return row.entry?.level === filter;
};

/** Row count per filter, for the filter bar's badges. */
export const countByFilter = (
  rows: readonly ConsoleRow[]
): Record<ConsoleFilter, number> => {
  const counts: Record<ConsoleFilter, number> = {
    all: rows.length,
    debug: 0,
    error: 0,
    info: 0,
    log: 0,
    network: 0,
    warn: 0,
  };
  for (const row of rows) {
    if (row.request) {
      counts.network += 1;
    } else if (row.entry?.level === "error") {
      counts.error += 1;
    } else if (row.entry?.level === "warn") {
      counts.warn += 1;
    } else if (row.entry?.level === "log") {
      counts.log += 1;
    } else if (row.entry?.level === "info") {
      counts.info += 1;
    } else if (row.entry?.level === "debug") {
      counts.debug += 1;
    }
  }
  return counts;
};
