import { Link } from "@tanstack/react-router";
import type { BugReportSummary } from "@zam/capture/application/ports/bug-report-read-model";

import { formatOffset } from "../lib/format-offset";
import { STATUS_LABELS } from "../lib/triage-labels";
import { ReportStatusBadge } from "./report-status-badge";
import { PriorityMark, TriageStatusGlyph } from "./triage-marks";

const DATE_FORMAT = new Intl.DateTimeFormat(undefined, {
  day: "numeric",
  month: "short",
});
const TIME_FORMAT = new Intl.DateTimeFormat(undefined, {
  hour: "numeric",
  minute: "2-digit",
});

const MAX_VISIBLE_TAGS = 3;

const plural = (count: number, word: string) =>
  `${count} ${count === 1 ? word : `${word}s`}`;

/** Console/network evidence and length as mono pills: the same vocabulary as the report wall. */
export const EvidenceChips = ({ report }: { report: BugReportSummary }) => (
  <span className="flex flex-wrap gap-1.5 font-mono text-[11px] tabular-nums">
    {report.errorCount > 0 ? (
      <span className="bg-destructive/10 text-destructive rounded-full px-2 py-0.5">
        {plural(report.errorCount, "error")}
      </span>
    ) : null}
    {report.failedRequestCount > 0 ? (
      <span className="bg-destructive/10 text-destructive rounded-full px-2 py-0.5">
        {report.failedRequestCount} failed
      </span>
    ) : null}
    <span className="bg-foreground/5 rounded-full px-2 py-0.5">
      {formatOffset(report.durationMs)}
    </span>
  </span>
);

export const ReportTags = ({ tags }: { tags: readonly string[] }) =>
  tags.length === 0 ? null : (
    <span className="flex flex-wrap gap-1">
      {tags.slice(0, MAX_VISIBLE_TAGS).map((tag) => (
        <span
          className="border-border text-muted-foreground rounded-full border px-1.5 text-[11px] leading-[18px]"
          key={tag}
        >
          {tag}
        </span>
      ))}
      {tags.length > MAX_VISIBLE_TAGS ? (
        <span className="text-muted-foreground text-[11px] leading-[18px]">
          +{tags.length - MAX_VISIBLE_TAGS}
        </span>
      ) : null}
    </span>
  );

const pageLabel = (pageUrl: string | null): string => {
  if (!pageUrl) {
    return "No page URL";
  }
  try {
    const url = new URL(pageUrl);
    return `${url.host}${url.pathname}`;
  } catch {
    return pageUrl;
  }
};

export const BugReportsTable = ({
  reports,
}: {
  reports: BugReportSummary[];
}) => (
  <ul className="bg-card divide-border divide-y overflow-hidden rounded-2xl">
    {reports.map((report) => (
      <li key={report.id}>
        <Link
          className="hover:bg-accent/60 focus-visible:bg-accent/60 ease-intent grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-2 px-5 py-4 transition-colors duration-500 outline-none md:grid-cols-[auto_minmax(0,1fr)_auto_1.5rem_5.5rem] md:items-center md:gap-x-5"
          params={{ reportId: report.id }}
          to="/r/$reportId"
        >
          <span
            className="pt-0.5 md:pt-0"
            title={`Status: ${STATUS_LABELS[report.triage.status]}`}
          >
            <TriageStatusGlyph status={report.triage.status} />
          </span>
          <span className="flex min-w-0 flex-col gap-1">
            <span className="flex min-w-0 items-center gap-2">
              <span className="truncate font-medium">{report.title}</span>
              {report.status === "draft" ? (
                <ReportStatusBadge status="draft" />
              ) : null}
            </span>
            <span className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
              <span className="text-muted-foreground truncate font-mono text-xs">
                {pageLabel(report.pageUrl)}
              </span>
              <ReportTags tags={report.triage.tags} />
            </span>
          </span>
          <span className="col-start-2 md:col-start-auto">
            <EvidenceChips report={report} />
          </span>
          <span className="hidden md:flex md:justify-center">
            <PriorityMark priority={report.triage.priority} />
          </span>
          <time
            className="text-muted-foreground col-start-2 font-mono text-xs tabular-nums md:col-start-auto md:text-right"
            dateTime={report.createdAt.toISOString()}
            title={report.createdAt.toLocaleString()}
          >
            <span className="md:block">
              {DATE_FORMAT.format(report.createdAt)}
            </span>{" "}
            <span className="md:block">
              {TIME_FORMAT.format(report.createdAt)}
            </span>
          </time>
        </Link>
      </li>
    ))}
  </ul>
);
