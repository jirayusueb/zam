import type { NetworkRequest } from "@zam/capture/domain/value-objects/devtools-snapshot";
import { Badge } from "@zam/ui/components/badge";
import { Checkbox } from "@zam/ui/components/checkbox";
import { Empty, EmptyDescription, EmptyTitle } from "@zam/ui/components/empty";
import { Input } from "@zam/ui/components/input";
import { Label } from "@zam/ui/components/label";
import {
  NativeSelect,
  NativeSelectOption,
} from "@zam/ui/components/native-select";
import { ToggleGroup, ToggleGroupItem } from "@zam/ui/components/toggle-group";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@zam/ui/components/tooltip";
import { cn } from "@zam/ui/lib/utils";
import { useId, useMemo } from "react";
import type { KeyboardEvent } from "react";
import { List } from "react-window";
import type { RowComponentProps } from "react-window";

import { useUrlDraft } from "@/shared/lib/use-url-draft";

import { formatOffset } from "../lib/format-offset";
import { isFailedRequest } from "../lib/is-failed-request";
import { networkEndpoint, statusLabel } from "../lib/network-request-format";
import {
  countByNetworkType,
  matchesNetworkType,
  NETWORK_TYPE_FILTERS,
  NETWORK_TYPE_LABELS,
} from "../lib/network-type";
import type { NetworkTypeFilter } from "../lib/network-type";
import { usePlayheadRow } from "../lib/use-playhead-row";
import {
  useReportSearch,
  useUpdateReportSearch,
} from "../lib/use-report-search";
import { useReportPlayback } from "../model/report-playback-context";
import { NetworkRequestDetail } from "./network-request-detail";

const ROW_HEIGHT = 40;
// Below md only #, time, name and status fit; Type/Method/Duration cells carry WIDE_ONLY.
const GRID_COLUMNS =
  "grid grid-cols-[2.5rem_4rem_minmax(0,1fr)_4.5rem] md:grid-cols-[2.5rem_5rem_minmax(0,1fr)_4rem_4.5rem_4rem_5rem] items-center";
const WIDE_ONLY = "max-md:hidden";
// With the detail pane open only #, time, name and status fit, as in Chrome DevTools.
const COMPACT_GRID_COLUMNS =
  "grid grid-cols-[2.5rem_4rem_minmax(0,1fr)_4.5rem] items-center";

interface NetworkRowProps {
  activeIndex: number;
  onSelect: (request: NetworkRequest, offsetMs: number) => void;
  requests: readonly NetworkRequest[];
  selected: NetworkRequest | null;
  startedAtMs: number;
}

const NetworkRow = ({
  activeIndex,
  ariaAttributes,
  index,
  onSelect,
  requests,
  selected,
  startedAtMs,
  style,
}: RowComponentProps<NetworkRowProps>) => {
  const request = requests[index];
  if (!request) {
    return null;
  }
  const offsetMs = request.timestamp - startedAtMs;
  const compact = selected !== null;
  return (
    <div {...ariaAttributes} style={style}>
      <button
        aria-current={index === activeIndex}
        aria-pressed={request === selected}
        className={`${compact ? COMPACT_GRID_COLUMNS : GRID_COLUMNS} hover:bg-muted/50 aria-pressed:bg-muted aria-[current=true]:bg-muted size-full border-b text-left text-sm`}
        onClick={() => onSelect(request, offsetMs)}
        type="button"
      >
        <span className="text-muted-foreground px-2 tabular-nums">
          {index + 1}
        </span>
        <span className="px-2">{formatOffset(offsetMs)}</span>
        <Tooltip>
          <TooltipTrigger render={<span className="truncate px-2 font-mono" />}>
            {networkEndpoint(request.url)}
          </TooltipTrigger>
          <TooltipContent>{request.url}</TooltipContent>
        </Tooltip>
        {compact ? null : (
          <span className={`text-muted-foreground px-2 lowercase ${WIDE_ONLY}`}>
            {request.type ?? "fetch"}
          </span>
        )}
        <span className="px-2">
          <Badge variant={isFailedRequest(request) ? "destructive" : "outline"}>
            {statusLabel(request.status, request.type)}
          </Badge>
        </span>
        {compact ? null : (
          <>
            <span className={`px-2 ${WIDE_ONLY}`}>{request.method}</span>
            <span className={`px-2 ${WIDE_ONLY}`}>{request.durationMs} ms</span>
          </>
        )}
      </button>
    </div>
  );
};
/** Chrome DevTools-style Network panel: filterable list, selecting a row seeks the video and opens its detail. */
export const NetworkRequestsTable = ({
  requests,
}: {
  requests: readonly NetworkRequest[];
}) => {
  const { playheadMs, seek: onSeek, startedAt } = useReportPlayback();
  const startedAtMs = startedAt.getTime();
  const search = useReportSearch();
  const update = useUpdateReportSearch();
  const [searchDraft, onSearchDraftChange] = useUrlDraft(
    search.nq ?? "",
    (next) => update({ nq: next || undefined })
  );
  const errorsOnly = search.errors ?? false;
  const method = search.method ?? "all";
  const type = search.type ?? "all";
  const searchId = useId();
  const errorsId = useId();
  const methodId = useId();

  const selected =
    search.req && search.req >= 1 ? (requests[search.req - 1] ?? null) : null;

  const methods = useMemo(
    () => [...new Set(requests.map((request) => request.method))].toSorted(),
    [requests]
  );
  const typeCounts = useMemo(() => countByNetworkType(requests), [requests]);

  const filteredRequests = useMemo(() => {
    const query = searchDraft.trim().toLowerCase();
    return requests.filter((request) => {
      if (errorsOnly && !isFailedRequest(request)) {
        return false;
      }
      if (method !== "all" && request.method !== method) {
        return false;
      }
      if (!matchesNetworkType(request, type)) {
        return false;
      }
      return query === "" || request.url.toLowerCase().includes(query);
    });
  }, [requests, errorsOnly, method, type, searchDraft]);

  const { activeIndex, listRef } = usePlayheadRow(
    filteredRequests,
    startedAtMs + playheadMs
  );

  const onSelect = (request: NetworkRequest, offsetMs: number) => {
    onSeek(offsetMs);
    update({ req: requests.indexOf(request) + 1 });
  };
  const onClose = () => update({ detail: undefined, req: undefined });

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      if (selected) {
        event.preventDefault();
        onClose();
      }
      return;
    }
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") {
      return;
    }
    if (filteredRequests.length === 0) {
      return;
    }
    event.preventDefault();
    const delta = event.key === "ArrowDown" ? 1 : -1;
    const currentIndex = selected ? filteredRequests.indexOf(selected) : -1;
    let nextIndex: number;
    if (currentIndex === -1) {
      nextIndex = delta === 1 ? 0 : filteredRequests.length - 1;
    } else {
      nextIndex = Math.min(
        Math.max(currentIndex + delta, 0),
        filteredRequests.length - 1
      );
    }
    const next = filteredRequests[nextIndex];
    if (next) {
      onSelect(next, next.timestamp - startedAtMs);
    }
  };

  return (
    // Row buttons and the search input are already focusable; this only layers
    // Up/Down/Esc shortcuts on top of click via bubbling, no extra tab stop needed.
    // oxlint-disable-next-line jsx-a11y/no-static-element-interactions -- keyboard shortcuts layered over focusable row buttons
    <div className="flex h-full min-h-0 flex-col" onKeyDown={onKeyDown}>
      <div className="flex flex-wrap items-center gap-3 border-b p-2">
        <ToggleGroup
          onValueChange={(next) => {
            const [value] = next;
            if (value) {
              update({
                type:
                  value === "all" ? undefined : (value as NetworkTypeFilter),
              });
            }
          }}
          value={[type]}
        >
          {NETWORK_TYPE_FILTERS.map((item) => (
            <ToggleGroupItem key={item} value={item}>
              {NETWORK_TYPE_LABELS[item]} ({typeCounts[item]})
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <div className="min-w-40 flex-1">
          <Label className="sr-only" htmlFor={searchId}>
            Search network requests
          </Label>
          <Input
            id={searchId}
            onChange={(event) => onSearchDraftChange(event.target.value)}
            placeholder="Filter by URL"
            type="search"
            value={searchDraft}
          />
        </div>
        <label
          className="flex shrink-0 items-center gap-2 text-sm"
          htmlFor={errorsId}
        >
          <Checkbox
            checked={errorsOnly}
            id={errorsId}
            onCheckedChange={(checked) =>
              update({ errors: checked ? true : undefined })
            }
          />
          Errors only
        </label>
        <div className="shrink-0">
          <Label className="sr-only" htmlFor={methodId}>
            Filter by method
          </Label>
          <NativeSelect
            id={methodId}
            onChange={(event) =>
              update({
                method:
                  event.target.value === "all" ? undefined : event.target.value,
              })
            }
            size="sm"
            value={method}
          >
            <NativeSelectOption value="all">All methods</NativeSelectOption>
            {methods.map((item) => (
              <NativeSelectOption key={item} value={item}>
                {item}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
        <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
          {filteredRequests.length}/{requests.length}
        </span>
      </div>
      <div className="flex min-h-0 flex-1">
        <div
          className={cn(
            "flex min-h-0 flex-col",
            selected ? "hidden w-2/5 shrink-0 lg:flex" : "flex-1"
          )}
        >
          {filteredRequests.length === 0 ? (
            <Empty>
              <EmptyTitle>No network requests</EmptyTitle>
              <EmptyDescription>
                {requests.length === 0
                  ? "No fetch, XHR or resource requests were captured during this recording."
                  : "No requests match these filters."}
              </EmptyDescription>
            </Empty>
          ) : (
            <>
              <div
                className={`${selected ? COMPACT_GRID_COLUMNS : GRID_COLUMNS} bg-background sticky top-0 h-10 shrink-0 border-b text-sm font-medium`}
              >
                <span className="px-2">#</span>
                <span className="px-2">Time</span>
                <span className="px-2">Name</span>
                {selected ? (
                  <span className="px-2">Status</span>
                ) : (
                  <>
                    <span className={`px-2 ${WIDE_ONLY}`}>Type</span>
                    <span className="px-2">Status</span>
                    <span className={`px-2 ${WIDE_ONLY}`}>Method</span>
                    <span className={`px-2 ${WIDE_ONLY}`}>Duration</span>
                  </>
                )}
              </div>
              <List
                className="min-h-0"
                listRef={listRef}
                rowComponent={NetworkRow}
                rowCount={filteredRequests.length}
                rowHeight={ROW_HEIGHT}
                rowProps={{
                  activeIndex,
                  onSelect,
                  requests: filteredRequests,
                  selected,
                  startedAtMs,
                }}
              />
            </>
          )}
        </div>
        {selected ? (
          <NetworkRequestDetail
            detail={search.detail ?? "headers"}
            onClose={onClose}
            onDetailChange={(next) =>
              update({ detail: next === "headers" ? undefined : next })
            }
            request={selected}
            startedAtMs={startedAtMs}
          />
        ) : null}
      </div>
    </div>
  );
};
