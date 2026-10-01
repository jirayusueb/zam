import { createFileRoute } from "@tanstack/react-router";
import { BUG_REPORT_SORTS } from "@zam/capture/application/query-specifications/bug-report-query";
import {
  REPORT_PRIORITIES,
  REPORT_STATUSES,
} from "@zam/capture/domain/value-objects/triage";
import { z } from "zod";

import { DashboardPage } from "@/pages/dashboard";

const dashboardSearchSchema = z.object({
  page: z.int().min(1).optional(),
  priority: z.enum(REPORT_PRIORITIES).optional(),
  q: z.string().optional(),
  sort: z.enum(BUG_REPORT_SORTS).optional(),
  status: z.enum(["draft", "published"]).optional(),
  triage: z.enum(REPORT_STATUSES).optional(),
  view: z.enum(["list", "board"]).optional(),
});

export const Route = createFileRoute("/_private/dashboard")({
  component: DashboardPage,
  validateSearch: dashboardSearchSchema,
});
