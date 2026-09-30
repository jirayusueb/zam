import type {
  ConsoleEntry,
  NetworkRequest,
} from "@zam/capture/domain/value-objects/devtools-snapshot";
import { Badge } from "@zam/ui/components/badge";
import { Empty, EmptyDescription, EmptyTitle } from "@zam/ui/components/empty";
import { Input } from "@zam/ui/components/input";
import { Label } from "@zam/ui/components/label";
import { ToggleGroup, ToggleGroupItem } from "@zam/ui/components/toggle-group";
import { useId, useMemo, useState } from "react";
import { List, useDynamicRowHeight } from "react-window";
import type { RowComponentProps } from "react-window";

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
              [{row.request?.method}] [{statusLabel(row.request?.status ?? 0)}]{" "}
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
  const [filter, setFilter] = useState<ConsoleFilter>("all");
  const [search, setSearch] = useState("");
  const searchId = useId();
  const rows = useMemo(() => consoleRows(entries, network), [entries, network]);
  const counts = useMemo(() => countByFilter(rows), [rows]);
  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
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
  }, [rows, filter, search]);
  const { activeIndex, listRef } = usePlayheadRow(
    filteredRows,
    startedAtMs + playheadMs
  );

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-3 border-b p-2">
        <ToggleGroup
          onValueChange={(next) => {
            const [value] = next;
            if (value) {
              setFilter(value as ConsoleFilter);
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
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Filter messages"
            type="search"
            value={search}
          />
        </div>
      </div>
      {filteredRows.length === 0 ? (
        <Empty>
          <EmptyTitle>No entries</EmptyTitle>
          <EmptyDescription>
            Nothing matches this filter for the recording.
          </EmptyDescription>
        </Empty>
      ) : (
        <div className={`${GRID_COLUMNS} border-b text-sm font-medium`}>
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
