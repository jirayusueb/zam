import type {
  ReportPriority,
  ReportStatus,
} from "@zam/capture/domain/value-objects/triage";

export const STATUS_LABELS: Record<ReportStatus, string> = {
  closed: "Closed",
  in_progress: "In progress",
  open: "Open",
  resolved: "Resolved",
};

export const PRIORITY_LABELS: Record<ReportPriority, string> = {
  high: "High",
  low: "Low",
  medium: "Medium",
  none: "None",
  urgent: "Urgent",
};
