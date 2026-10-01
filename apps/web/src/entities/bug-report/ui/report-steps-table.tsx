import type { NetworkRequest } from "@zam/capture/domain/value-objects/devtools-snapshot";
import type { UserStep } from "@zam/capture/domain/value-objects/user-step";
import { Badge } from "@zam/ui/components/badge";
import { Empty, EmptyDescription, EmptyTitle } from "@zam/ui/components/empty";
import { ToggleGroup, ToggleGroupItem } from "@zam/ui/components/toggle-group";
import {
  Eye,
  EyeOff,
  MonitorPlay,
  MousePointerClick,
  Navigation,
  WifiOff,
} from "lucide-react";
import { useMemo } from "react";

import { formatOffset } from "../lib/format-offset";
import { statusLabel } from "../lib/network-request-format";
import type { StepFilter, TimelineRow } from "../lib/report-steps";
import {
  countByStepFilter,
  matchesStepFilter,
  STEP_FILTERS,
  timelineRows,
} from "../lib/report-steps";
import {
  useReportSearch,
  useUpdateReportSearch,
} from "../lib/use-report-search";
import { useReportPlayback } from "../model/report-playback-context";

const rowIcon = (row: TimelineRow) => {
  if (row.kind === "start") {
    return <MonitorPlay aria-hidden className="size-4" />;
  }
  if (row.kind === "click") {
    return <MousePointerClick aria-hidden className="size-4" />;
  }
  if (row.kind === "navigation") {
    return <Navigation aria-hidden className="size-4" />;
  }
  if (row.kind === "networkError") {
    return <WifiOff aria-hidden className="text-destructive size-4" />;
  }
  return row.step?.detail === "hidden" ? (
    <EyeOff aria-hidden className="size-4" />
  ) : (
    <Eye aria-hidden className="size-4" />
  );
};

const rowLabel = (row: TimelineRow): string => {
  if (row.kind === "start") {
    return "Screen recording start";
  }
  if (row.kind === "networkError" && row.request) {
    return `${row.request.method} ${statusLabel(row.request.status, row.request.type)} ${row.request.url}`;
  }
  if (row.kind === "visibility" && row.step) {
    return row.step.detail === "hidden"
      ? "Tab became hidden"
      : "Tab became visible";
  }
  return row.step?.detail ?? "";
};

/** Chrome DevTools-style Steps panel: recording start, reporter actions and failed requests on one clock. */
export const ReportStepsTable = ({
  network,
  steps,
}: {
  network: readonly NetworkRequest[];
  steps: readonly UserStep[];
}) => {
  const { playheadMs, seek, startedAt } = useReportPlayback();
  const startedAtMs = startedAt.getTime();
  const search = useReportSearch();
  const update = useUpdateReportSearch();
  const filter = search.steps ?? "all";
  const rows = useMemo(
    () => timelineRows(steps, network, startedAt),
    [steps, network, startedAt]
  );
  const counts = useMemo(() => countByStepFilter(rows), [rows]);
  const filteredRows = useMemo(
    () => rows.filter((row) => matchesStepFilter(row, filter)),
    [rows, filter]
  );
  const playheadAtMs = startedAtMs + playheadMs;
  let activeIndex = -1;
  for (const [index, row] of filteredRows.entries()) {
    if (row.timestamp > playheadAtMs) {
      break;
    }
    activeIndex = index;
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 overflow-x-auto border-b p-2">
        <ToggleGroup
          onValueChange={(next) => {
            const [value] = next;
            if (value) {
              update({
                steps: value === "all" ? undefined : (value as StepFilter),
              });
            }
          }}
          value={[filter]}
        >
          {STEP_FILTERS.map((item) => (
            <ToggleGroupItem key={item.value} value={item.value}>
              {item.label} ({counts[item.value]})
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
      {filteredRows.length === 0 ? (
        <Empty>
          <EmptyTitle>No steps</EmptyTitle>
          <EmptyDescription>
            Nothing matches this filter for the recording.
          </EmptyDescription>
        </Empty>
      ) : (
        <ol className="min-h-0 flex-1 overflow-auto">
          {filteredRows.map((row, index) => {
            const offsetMs = Math.max(row.timestamp - startedAtMs, 0);
            return (
              <li key={row.id}>
                <button
                  aria-current={index === activeIndex}
                  className="hover:bg-muted/50 aria-[current=true]:bg-muted flex w-full items-center gap-3 border-b px-3 py-2 text-left text-sm"
                  onClick={() => seek(offsetMs)}
                  type="button"
                >
                  <span className="text-muted-foreground shrink-0">
                    {rowIcon(row)}
                  </span>
                  <span className="text-muted-foreground w-14 shrink-0 font-mono text-xs tabular-nums">
                    {formatOffset(offsetMs)}
                  </span>
                  <span
                    className={
                      row.kind === "networkError" || row.kind === "click"
                        ? "min-w-0 flex-1 truncate font-mono text-xs"
                        : "min-w-0 flex-1 truncate"
                    }
                  >
                    {rowLabel(row)}
                  </span>
                  {row.kind === "networkError" && row.request ? (
                    <Badge variant="destructive">
                      {statusLabel(row.request.status, row.request.type)}
                    </Badge>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
};
