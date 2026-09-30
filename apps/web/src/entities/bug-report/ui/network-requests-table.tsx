import type { NetworkRequest } from "@zam/capture/domain/value-objects/devtools-snapshot";
import { Badge } from "@zam/ui/components/badge";
import { Empty, EmptyDescription, EmptyTitle } from "@zam/ui/components/empty";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@zam/ui/components/tooltip";
import { List } from "react-window";
import type { RowComponentProps } from "react-window";

import { formatOffset } from "../lib/format-offset";
import { usePlayheadRow } from "../lib/use-playhead-row";
import { useReportPlayback } from "../model/report-playback-context";

const FAILED_STATUS = 0;
const ERROR_STATUS_THRESHOLD = 400;
const ROW_HEIGHT = 40;
const GRID_COLUMNS =
  "grid grid-cols-[6rem_5rem_5rem_minmax(0,1fr)_6rem] items-center";

const statusLabel = (status: number): string =>
  status === FAILED_STATUS ? "failed" : String(status);

const isErrorStatus = (status: number): boolean =>
  status === FAILED_STATUS || status >= ERROR_STATUS_THRESHOLD;

interface NetworkRowProps {
  activeIndex: number;
  onSeek: (offsetMs: number) => void;
  requests: readonly NetworkRequest[];
  startedAtMs: number;
}

const NetworkRow = ({
  activeIndex,
  ariaAttributes,
  index,
  onSeek,
  requests,
  startedAtMs,
  style,
}: RowComponentProps<NetworkRowProps>) => {
  const request = requests[index];
  if (!request) {
    return null;
  }
  const offsetMs = request.timestamp - startedAtMs;
  return (
    <div {...ariaAttributes} style={style}>
      <button
        aria-current={index === activeIndex}
        className={`${GRID_COLUMNS} hover:bg-muted/50 aria-[current=true]:bg-muted size-full border-b text-left text-sm`}
        onClick={() => onSeek(offsetMs)}
        type="button"
      >
        <span className="px-2">{formatOffset(offsetMs)}</span>
        <span className="px-2">{request.method}</span>
        <span className="px-2">
          <Badge
            variant={isErrorStatus(request.status) ? "destructive" : "outline"}
          >
            {statusLabel(request.status)}
          </Badge>
        </span>
        <Tooltip>
          <TooltipTrigger render={<span className="truncate px-2" />}>
            {request.url}
          </TooltipTrigger>
          <TooltipContent>{request.url}</TooltipContent>
        </Tooltip>
        <span className="px-2">{request.durationMs} ms</span>
      </button>
    </div>
  );
};

export const NetworkRequestsTable = ({
  requests,
}: {
  requests: readonly NetworkRequest[];
}) => {
  const { playheadMs, seek: onSeek, startedAt } = useReportPlayback();
  const startedAtMs = startedAt.getTime();
  const { activeIndex, listRef } = usePlayheadRow(
    requests,
    startedAtMs + playheadMs
  );

  if (requests.length === 0) {
    return (
      <Empty>
        <EmptyTitle>No network requests</EmptyTitle>
        <EmptyDescription>
          No fetch or XHR calls were captured during this recording.
        </EmptyDescription>
      </Empty>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className={`${GRID_COLUMNS} h-10 border-b text-sm font-medium`}>
        <span className="px-2">Video time</span>
        <span className="px-2">Method</span>
        <span className="px-2">Status</span>
        <span className="px-2">URL</span>
        <span className="px-2">Duration</span>
      </div>
      <List
        className="min-h-0"
        listRef={listRef}
        rowComponent={NetworkRow}
        rowCount={requests.length}
        rowHeight={ROW_HEIGHT}
        rowProps={{ activeIndex, onSeek, requests, startedAtMs }}
      />
    </div>
  );
};
