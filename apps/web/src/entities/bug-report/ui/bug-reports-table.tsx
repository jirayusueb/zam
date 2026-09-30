import { Link } from "@tanstack/react-router";
import type { BugReportSummary } from "@zam/capture/application/ports/bug-report-read-model";

import { formatOffset } from "../lib/format-offset";
import { ReportStatusBadge } from "./report-status-badge";

const DATE_FORMAT = new Intl.DateTimeFormat(undefined, {
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  month: "short",
});

export const BugReportsTable = ({
  reports,
}: {
  reports: BugReportSummary[];
}) => (
  <ul className="bg-card divide-border divide-y overflow-hidden rounded-2xl">
    {reports.map((report) => (
      <li key={report.id}>
        <Link
          className="hover:bg-accent/60 focus-visible:bg-accent/60 ease-intent grid gap-x-6 gap-y-1 px-5 py-4 transition-colors duration-500 outline-none md:grid-cols-[minmax(0,1fr)_7rem_4rem_8rem] md:items-center"
          params={{ reportId: report.id }}
          to="/r/$reportId"
        >
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="truncate font-medium">{report.title}</span>
            <span className="text-muted-foreground truncate font-mono text-xs">
              {report.pageUrl ?? "No page URL"}
            </span>
          </span>
          <ReportStatusBadge status={report.status} />
          <span className="text-muted-foreground font-mono text-xs tabular-nums">
            {formatOffset(report.durationMs)}
          </span>
          <time
            className="text-muted-foreground font-mono text-xs tabular-nums md:text-right"
            dateTime={report.createdAt.toISOString()}
          >
            {DATE_FORMAT.format(report.createdAt)}
          </time>
        </Link>
      </li>
    ))}
  </ul>
);
