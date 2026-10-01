import type {
  NetworkRequest,
  NetworkResourceType,
} from "@zam/capture/domain/value-objects/devtools-snapshot";

/** Network-panel type chips: `fetch` covers fetch+xhr+legacy (no `type`); `media` covers media+image. */
export const NETWORK_TYPE_FILTERS = [
  "all",
  "fetch",
  "websocket",
  "script",
  "stylesheet",
  "media",
  "font",
  "document",
  "manifest",
  "other",
] as const;
export type NetworkTypeFilter = (typeof NETWORK_TYPE_FILTERS)[number];

export const NETWORK_TYPE_LABELS: Record<NetworkTypeFilter, string> = {
  all: "All",
  document: "Doc",
  fetch: "Fetch",
  font: "Font",
  manifest: "Manifest",
  media: "Media",
  other: "Other",
  script: "Script",
  stylesheet: "CSS",
  websocket: "WS",
};

/** Chip a request groups under: absent `type` and `xhr` join `fetch`; `image` joins `media`. */
export const networkTypeGroup = (
  request: NetworkRequest
): Exclude<NetworkTypeFilter, "all"> => {
  const type: NetworkResourceType = request.type ?? "fetch";
  if (type === "xhr") {
    return "fetch";
  }
  if (type === "image") {
    return "media";
  }
  return type;
};

export const matchesNetworkType = (
  request: NetworkRequest,
  filter: NetworkTypeFilter
): boolean => filter === "all" || networkTypeGroup(request) === filter;

/** Row count per type chip, for the filter bar's badges. */
export const countByNetworkType = (
  requests: readonly NetworkRequest[]
): Record<NetworkTypeFilter, number> => {
  const counts = Object.fromEntries(
    NETWORK_TYPE_FILTERS.map((filter) => [filter, 0])
  ) as Record<NetworkTypeFilter, number>;
  counts.all = requests.length;
  for (const request of requests) {
    counts[networkTypeGroup(request)] += 1;
  }
  return counts;
};
