import { createFileRoute } from "@tanstack/react-router";
import { BUG_REPORT_SORTS } from "@zam/capture/application/query-specifications/bug-report-query";
import { z } from "zod";

import { DashboardPage } from "@/pages/dashboard";

const dashboardSearchSchema = z.object({
  page: z.int().min(1).optional(),
  q: z.string().optional(),
  sort: z.enum(BUG_REPORT_SORTS).optional(),
  status: z.enum(["draft", "published"]).optional(),
});

export const Route = createFileRoute("/_private/dashboard")({
  component: DashboardPage,
  validateSearch: dashboardSearchSchema,
});
