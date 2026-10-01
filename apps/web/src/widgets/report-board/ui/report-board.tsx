import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { QueryKey } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import type { BugReportSummary } from "@zam/capture/application/ports/bug-report-read-model";
import type { BugReportSummaryList } from "@zam/capture/application/queries/list-my-bug-reports";
import { REPORT_STATUSES } from "@zam/capture/domain/value-objects/triage";
import type { ReportStatus } from "@zam/capture/domain/value-objects/triage";
import { Button } from "@zam/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@zam/ui/components/dropdown-menu";
import { cn } from "@zam/ui/lib/utils";
import { MoreHorizontal } from "lucide-react";
import { useState } from "react";
import type { DragEvent } from "react";
import { toast } from "sonner";

import {
  EvidenceChips,
  PriorityMark,
  ReportStatusBadge,
  ReportTags,
  STATUS_LABELS,
  TriageStatusGlyph,
} from "@/entities/bug-report";
import { orpc } from "@/shared/api/orpc";

const DRAG_TYPE = "application/x-zam-report";

const withStatus = (
  list: BugReportSummaryList | undefined,
  reportId: string,
  status: ReportStatus
): BugReportSummaryList | undefined =>
  list && {
    ...list,
    items: list.items.map((item) =>
      item.id === reportId
        ? { ...item, triage: { ...item.triage, status } }
        : item
    ),
  };

const BoardCard = ({
  onMove,
  report,
}: {
  onMove: (reportId: string, status: ReportStatus) => void;
  report: BugReportSummary;
}) => {
  const [dragging, setDragging] = useState(false);
  return (
    // Drag-and-drop is the pointer shortcut; the card menu ("Move to") is the keyboard/touch path.
    // oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <li
      className={cn(
        "bg-card group relative flex flex-col gap-2.5 rounded-2xl p-4 shadow-[0_10px_20px_#4747410a] transition-opacity dark:shadow-none",
        dragging && "opacity-40"
      )}
      draggable
      onDragEnd={() => setDragging(false)}
      onDragStart={(event) => {
        event.dataTransfer.setData(DRAG_TYPE, report.id);
        event.dataTransfer.effectAllowed = "move";
        setDragging(true);
      }}
    >
      <div className="flex items-start gap-2">
        <Link
          className="min-w-0 flex-1 text-sm leading-snug font-medium outline-none after:absolute after:inset-0 after:rounded-2xl focus-visible:after:outline-2 focus-visible:after:outline-offset-2"
          params={{ reportId: report.id }}
          to="/r/$reportId"
        >
          {report.title}
        </Link>
        {/* Keyboard and touch path for what drag-and-drop does with a mouse. */}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                aria-label={`Move "${report.title}"`}
                className="relative -mt-1 -mr-2 opacity-60 group-hover:opacity-100 focus-visible:opacity-100"
                size="icon-xs"
                variant="ghost"
              />
            }
          >
            <MoreHorizontal aria-hidden />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-40">
            <DropdownMenuGroup>
              <DropdownMenuLabel>Move to</DropdownMenuLabel>
              <DropdownMenuRadioGroup
                onValueChange={(value) =>
                  onMove(report.id, value as ReportStatus)
                }
                value={report.triage.status}
              >
                {REPORT_STATUSES.map((status) => (
                  <DropdownMenuRadioItem key={status} value={status}>
                    {STATUS_LABELS[status]}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <ReportTags tags={report.triage.tags} />
      <div className="flex items-center justify-between gap-2">
        <EvidenceChips report={report} />
        <span className="flex items-center gap-2">
          {report.status === "draft" ? (
            <ReportStatusBadge status="draft" />
          ) : null}
          <PriorityMark priority={report.triage.priority} />
        </span>
      </div>
    </li>
  );
};

const BoardColumn = ({
  onMove,
  reports,
  status,
}: {
  onMove: (reportId: string, status: ReportStatus) => void;
  reports: BugReportSummary[];
  status: ReportStatus;
}) => {
  const [over, setOver] = useState(false);
  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    setOver(false);
    const reportId = event.dataTransfer.getData(DRAG_TYPE);
    if (reportId) {
      onMove(reportId, status);
    }
  };
  return (
    // Drop target for the pointer shortcut; keyboard users move cards from the card menu.
    // oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <section
      aria-labelledby={`board-${status}`}
      className={cn(
        "bg-foreground/[0.03] ease-intent flex min-h-64 w-[19rem] shrink-0 flex-col gap-3 rounded-[20px] p-2 transition-[background-color,box-shadow] duration-300 lg:w-auto lg:shrink",
        over && "bg-brand/25 ring-foreground/20 ring-1"
      )}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setOver(false);
        }
      }}
      onDragOver={(event) => {
        if (event.dataTransfer.types.includes(DRAG_TYPE)) {
          event.preventDefault();
          setOver(true);
        }
      }}
      onDrop={onDrop}
    >
      <h2
        className="flex items-center gap-2 px-2 pt-2 text-sm font-medium"
        id={`board-${status}`}
      >
        <TriageStatusGlyph status={status} />
        {STATUS_LABELS[status]}
        <span className="text-muted-foreground font-mono text-xs tabular-nums">
          {reports.length}
        </span>
      </h2>
      {reports.length === 0 ? (
        <p className="text-muted-foreground border-border mx-1 rounded-2xl border border-dashed px-3 py-6 text-center text-xs">
          Drop a report here
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {reports.map((report) => (
            <BoardCard key={report.id} onMove={onMove} report={report} />
          ))}
        </ul>
      )}
    </section>
  );
};

/**
 * Kanban of the reporter's reports by triage status. Moving a card (drag, or
 * the card menu) updates the status optimistically and rolls back on error.
 */
export const ReportBoard = ({
  listQueryKey,
  reports,
}: {
  /** The list query whose cache holds `reports`, for the optimistic update. */
  listQueryKey: QueryKey;
  reports: BugReportSummary[];
}) => {
  const queryClient = useQueryClient();
  const move = useMutation(
    orpc.bugReport.update.mutationOptions({
      // No manual rollback: onSettled refetches, which restores the server's status after a failure.
      onError: (error) => {
        toast.error(`Couldn't move the report: ${error.message}`);
      },
      onMutate: async ({ reportId, status }) => {
        await queryClient.cancelQueries({ queryKey: listQueryKey });
        if (status) {
          queryClient.setQueryData<BugReportSummaryList>(
            listQueryKey,
            (previous) => withStatus(previous, reportId, status)
          );
        }
      },
      onSettled: () =>
        queryClient.invalidateQueries({
          queryKey: orpc.bugReport.listMine.key(),
        }),
    })
  );

  const onMove = (reportId: string, status: ReportStatus) => {
    const current = reports.find((report) => report.id === reportId);
    if (current && current.triage.status !== status) {
      move.mutate({ reportId, status });
    }
  };

  return (
    <div className="-mx-5 flex gap-3 overflow-x-auto px-5 pb-2 md:-mx-10 md:px-10 lg:grid lg:grid-cols-4 lg:overflow-visible">
      {REPORT_STATUSES.map((status) => (
        <BoardColumn
          key={status}
          onMove={onMove}
          reports={reports.filter((report) => report.triage.status === status)}
          status={status}
        />
      ))}
    </div>
  );
};
