import type { BugReportSummary } from "@zam/capture/application/ports/bug-report-read-model";
import { cn } from "@zam/ui/lib/utils";

export const ReportStatusBadge = ({
  status,
}: {
  status: BugReportSummary["status"];
}) => (
  <span className="text-muted-foreground inline-flex items-center gap-1.5 text-xs">
    <span
      aria-hidden
      className={cn(
        "size-2 rounded-full",
        status === "draft"
          ? "border-muted-foreground border border-dashed"
          : "bg-brand ring-foreground/15 ring-1"
      )}
    />
    {status === "draft" ? "Draft" : "Published"}
  </span>
);
