import type { ConsoleEntry } from "@zam/capture/domain/value-objects/devtools-snapshot";
import { Badge } from "@zam/ui/components/badge";
import { Empty, EmptyDescription, EmptyTitle } from "@zam/ui/components/empty";
import { List, useDynamicRowHeight } from "react-window";
import type { RowComponentProps } from "react-window";

import { formatOffset } from "../lib/format-offset";
import { usePlayheadRow } from "../lib/use-playhead-row";
import { useReportPlayback } from "../model/report-playback-context";

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
  entries: readonly ConsoleEntry[];
  onSeek: (offsetMs: number) => void;
  startedAtMs: number;
}

const ConsoleRow = ({
  activeIndex,
  ariaAttributes,
  entries,
  index,
  onSeek,
  startedAtMs,
  style,
}: RowComponentProps<ConsoleRowProps>) => {
  const entry = entries[index];
  if (!entry) {
    return null;
  }
  const offsetMs = entry.timestamp - startedAtMs;
  return (
    <div {...ariaAttributes} style={style}>
      <button
        aria-current={index === activeIndex}
        className={`${GRID_COLUMNS} hover:bg-muted/50 aria-[current=true]:bg-muted w-full border-b text-left text-sm`}
        onClick={() => onSeek(offsetMs)}
        type="button"
      >
        <span className="p-2">{formatOffset(offsetMs)}</span>
        <span className="p-2">
          <Badge variant={levelVariant(entry.level)}>{entry.level}</Badge>
        </span>
        <pre className="p-2 break-all whitespace-pre-wrap">{entry.message}</pre>
      </button>
    </div>
  );
};

export const ConsoleEntriesTable = ({
  entries,
}: {
  entries: readonly ConsoleEntry[];
}) => {
  const { playheadMs, seek: onSeek, startedAt } = useReportPlayback();
  const startedAtMs = startedAt.getTime();
  const rowHeight = useDynamicRowHeight({
    defaultRowHeight: ESTIMATED_ROW_HEIGHT,
  });
  const { activeIndex, listRef } = usePlayheadRow(
    entries,
    startedAtMs + playheadMs
  );

  if (entries.length === 0) {
    return (
      <Empty>
        <EmptyTitle>No console entries</EmptyTitle>
        <EmptyDescription>
          Nothing was logged during this recording.
        </EmptyDescription>
      </Empty>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className={`${GRID_COLUMNS} border-b text-sm font-medium`}>
        <span className="p-2">Video time</span>
        <span className="p-2">Level</span>
        <span className="p-2">Message</span>
      </div>
      <List
        className="min-h-0"
        listRef={listRef}
        rowComponent={ConsoleRow}
        rowCount={entries.length}
        rowHeight={rowHeight}
        rowProps={{ activeIndex, entries, onSeek, startedAtMs }}
      />
    </div>
  );
};
