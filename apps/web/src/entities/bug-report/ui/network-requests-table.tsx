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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@zam/ui/components/tooltip";
import { cn } from "@zam/ui/lib/utils";
import { useId, useMemo, useState } from "react";
import { List } from "react-window";
import type { RowComponentProps } from "react-window";

import { formatOffset } from "../lib/format-offset";
import { isFailedRequest } from "../lib/is-failed-request";
import {
  isErrorStatus,
  networkEndpoint,
  statusLabel,
} from "../lib/network-request-format";
import { usePlayheadRow } from "../lib/use-playhead-row";
import { useReportPlayback } from "../model/report-playback-context";
import { NetworkRequestDetail } from "./network-request-detail";

const ROW_HEIGHT = 40;
const GRID_COLUMNS =
  "grid grid-cols-[2.5rem_5rem_minmax(0,1fr)_4.5rem_4rem_5rem] items-center";
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
        <span className="px-2">
          <Badge
            variant={isErrorStatus(request.status) ? "destructive" : "outline"}
          >
            {statusLabel(request.status)}
          </Badge>
        </span>
        {compact ? null : (
          <>
            <span className="px-2">{request.method}</span>
            <span className="px-2">{request.durationMs} ms</span>
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
  const [search, setSearch] = useState("");
  const [errorsOnly, setErrorsOnly] = useState(false);
  const [method, setMethod] = useState("all");
  const [selected, setSelected] = useState<NetworkRequest | null>(null);
  const searchId = useId();
  const errorsId = useId();
  const methodId = useId();

  const methods = useMemo(
    () => [...new Set(requests.map((request) => request.method))].toSorted(),
    [requests]
  );

  const filteredRequests = useMemo(() => {
    const query = search.trim().toLowerCase();
    return requests.filter((request) => {
      if (errorsOnly && !isFailedRequest(request)) {
        return false;
      }
      if (method !== "all" && request.method !== method) {
        return false;
      }
      return query === "" || request.url.toLowerCase().includes(query);
    });
  }, [requests, errorsOnly, method, search]);

  const { activeIndex, listRef } = usePlayheadRow(
    filteredRequests,
    startedAtMs + playheadMs
  );

  const onSelect = (request: NetworkRequest, offsetMs: number) => {
    onSeek(offsetMs);
    setSelected(request);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-center gap-3 border-b p-2">
        <div className="min-w-40 flex-1">
          <Label className="sr-only" htmlFor={searchId}>
            Search network requests
          </Label>
          <Input
            id={searchId}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Filter by URL"
            type="search"
            value={search}
          />
        </div>
        <label
          className="flex shrink-0 items-center gap-2 text-sm"
          htmlFor={errorsId}
        >
          <Checkbox
            checked={errorsOnly}
            id={errorsId}
            onCheckedChange={setErrorsOnly}
          />
          Errors only
        </label>
        <div className="shrink-0">
          <Label className="sr-only" htmlFor={methodId}>
            Filter by method
          </Label>
          <NativeSelect
            id={methodId}
            onChange={(event) => setMethod(event.target.value)}
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
                  ? "No fetch or XHR calls were captured during this recording."
                  : "No requests match these filters."}
              </EmptyDescription>
            </Empty>
          ) : (
            <>
              <div
                className={`${selected ? COMPACT_GRID_COLUMNS : GRID_COLUMNS} h-10 shrink-0 border-b text-sm font-medium`}
              >
                <span className="px-2">#</span>
                <span className="px-2">Time</span>
                <span className="px-2">Name</span>
                <span className="px-2">Status</span>
                {selected ? null : (
                  <>
                    <span className="px-2">Method</span>
                    <span className="px-2">Duration</span>
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
            onClose={() => setSelected(null)}
            request={selected}
            startedAtMs={startedAtMs}
          />
        ) : null}
      </div>
    </div>
  );
};
