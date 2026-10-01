export const REPORT_TABS = [
  "info",
  "console",
  "network",
  "steps",
  "metadata",
  "application",
] as const;
export type ReportTab = (typeof REPORT_TABS)[number];
