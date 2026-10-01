import type {
  ConsoleEntry,
  NetworkRequest,
} from "@zam/capture/domain/value-objects/devtools-snapshot";
import { Badge } from "@zam/ui/components/badge";
import { Empty, EmptyDescription, EmptyTitle } from "@zam/ui/components/empty";
import { Input } from "@zam/ui/components/input";
import { Label } from "@zam/ui/components/label";
import { ToggleGroup, ToggleGroupItem } from "@zam/ui/components/toggle-group";
import { useId, useMemo } from "react";
import type { KeyboardEvent } from "react";
import { List, useDynamicRowHeight } from "react-window";
import type { RowComponentProps } from "react-window";

import { useUrlDraft } from "@/shared/lib/use-url-draft";

import {
  CONSOLE_FILTERS,
  consoleRows,
  countByFilter,
  matchesConsoleFilter,
} from "../lib/console-rows";
import type { ConsoleFilter, ConsoleRow } from "../lib/console-rows";
import { formatOffset } from "../lib/format-offset";
import { networkEndpoint, statusLabel } from "../lib/network-request-format";
import { usePlayheadRow } from "../lib/use-playhead-row";
import {
  useReportSearch,
  useUpdateReportSearch,
} from "../lib/use-report-search";
import { useReportPlayback } from "../model/report-playback-context";
import { JsonValue } from "./json-value";

const ESTIMATED_ROW_HEIGHT = 40;
const GRID_COLUMNS = "grid grid-cols-[6rem_5rem_minmax(0,1fr)]";

const levelVariant = (
  level: ConsoleEntry["level"]
): "destructive" | "outline" | "secondary" => {
  if (level === "error") {
    return "destructive";
  }
  if (level === "warn") {
    return "secondary";
  }
  return "outline";
};

interface ConsoleRowProps {
  activeIndex: number;
  onSeek: (offsetMs: number) => void;
  rows: readonly ConsoleRow[];
  startedAtMs: number;
}

const ConsoleRowView = ({
  activeIndex,
  ariaAttributes,
  index,
  onSeek,
  rows,
  startedAtMs,
  style,
}: RowComponentProps<ConsoleRowProps>) => {
  const row = rows[index];
  if (!row) {
    return null;
  }
  const offsetMs = row.timestamp - startedAtMs;
  return (
    <div {...ariaAttributes} style={style}>
      <button
        aria-current={index === activeIndex}
        className={`${GRID_COLUMNS} hover:bg-muted/50 aria-[current=true]:bg-muted w-full border-b text-left text-sm`}
        onClick={() => onSeek(offsetMs)}
        type="button"
      >
        <span className="p-2">{formatOffset(offsetMs)}</span>
        {row.entry ? (
          <>
            <span className="p-2">
              <Badge variant={levelVariant(row.entry.level)}>
                {row.entry.level}
              </Badge>
            </span>
            <div className="p-2">
              <JsonValue value={row.entry.message} />
            </div>
          </>
        ) : (
          <>
            <span className="p-2">
              <Badge variant="destructive">network</Badge>
            </span>
            <span className="truncate p-2 font-mono" title={row.request?.url}>
              [{row.request?.method}] [
              {statusLabel(row.request?.status ?? 0, row.request?.type)}]{" "}
              {networkEndpoint(row.request?.url ?? "")}
            </span>
          </>
        )}
      </button>
    </div>
  );
};

export const ConsoleEntriesTable = ({
  entries,
  network,
}: {
  entries: readonly ConsoleEntry[];
  network: readonly NetworkRequest[];
}) => {
  const { playheadMs, seek: onSeek, startedAt } = useReportPlayback();
  const startedAtMs = startedAt.getTime();
  const rowHeight = useDynamicRowHeight({
    defaultRowHeight: ESTIMATED_ROW_HEIGHT,
  });
  const search = useReportSearch();
  const update = useUpdateReportSearch();
  const filter = search.console ?? "all";
  const [searchDraft, onSearchDraftChange] = useUrlDraft(
    search.q ?? "",
    (next) => update({ q: next || undefined })
  );
  const searchId = useId();
  const rows = useMemo(() => consoleRows(entries, network), [entries, network]);
  const counts = useMemo(() => countByFilter(rows), [rows]);
  const filteredRows = useMemo(() => {
    const query = searchDraft.trim().toLowerCase();
    return rows.filter((row) => {
      if (!matchesConsoleFilter(row, filter)) {
        return false;
      }
      if (query === "") {
        return true;
      }
      const text = row.entry ? row.entry.message : (row.request?.url ?? "");
      return text.toLowerCase().includes(query);
    });
  }, [rows, filter, searchDraft]);
  const { activeIndex, listRef } = usePlayheadRow(
    filteredRows,
    startedAtMs + playheadMs
  );

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") {
      return;
    }
    if (filteredRows.length === 0) {
      return;
    }
    event.preventDefault();
    const delta = event.key === "ArrowDown" ? 1 : -1;
    const nextIndex = Math.min(
      Math.max(activeIndex + delta, 0),
      filteredRows.length - 1
    );
    const next = filteredRows[nextIndex];
    if (next) {
      onSeek(Math.max(next.timestamp - startedAtMs, 0));
    }
  };

  return (
    // Row buttons and the search input are already focusable; this only layers
    // Up/Down shortcuts on top of click via bubbling, no extra tab stop needed.
    // oxlint-disable-next-line jsx-a11y/no-static-element-interactions -- keyboard shortcuts layered over focusable row buttons
    <div className="flex h-full flex-col" onKeyDown={onKeyDown}>
      <div className="flex flex-wrap items-center gap-3 border-b p-2">
        <ToggleGroup
          onValueChange={(next) => {
            const [value] = next;
            if (value) {
              update({
                console: value === "all" ? undefined : (value as ConsoleFilter),
              });
            }
          }}
          value={[filter]}
        >
          {CONSOLE_FILTERS.map((item) => (
            <ToggleGroupItem key={item.value} value={item.value}>
              {item.label} ({counts[item.value]})
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <div className="min-w-40 flex-1">
          <Label className="sr-only" htmlFor={searchId}>
            Search console entries
          </Label>
          <Input
            id={searchId}
            onChange={(event) => onSearchDraftChange(event.target.value)}
            placeholder="Filter messages"
            type="search"
            value={searchDraft}
          />
        </div>
        <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
          {filteredRows.length}/{rows.length}
        </span>
      </div>
      {filteredRows.length === 0 ? (
        <Empty>
          <EmptyTitle>No entries</EmptyTitle>
          <EmptyDescription>
            Nothing matches this filter for the recording.
          </EmptyDescription>
        </Empty>
      ) : (
        <div
          className={`${GRID_COLUMNS} bg-background sticky top-0 border-b text-sm font-medium`}
        >
          <span className="p-2">Video time</span>
          <span className="p-2">Level</span>
          <span className="p-2">Message</span>
        </div>
      )}
      {filteredRows.length > 0 && (
        <List
          className="min-h-0"
          listRef={listRef}
          rowComponent={ConsoleRowView}
          rowCount={filteredRows.length}
          rowHeight={rowHeight}
          rowProps={{ activeIndex, onSeek, rows: filteredRows, startedAtMs }}
        />
      )}
    </div>
  );
};
