import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import type { ZodTypeAny } from "zod";

import {
  CONSOLE_FILTER_VALUES,
  DETAIL_TABS,
  NETWORK_TYPE_FILTERS,
  REPORT_TABS,
  STEP_FILTER_VALUES,
  STORAGE_AREAS,
} from "@/entities/bug-report";
import { SharedReportPage } from "@/pages/shared-report";

/** Invalid/missing search params fall back to the caller's default instead of erroring the route. */
// oxlint-disable-next-line arrow-body-style -- block body keeps the next-line disable below scoped to the `.catch()` call only
const optionalOrDefault = <T extends ZodTypeAny>(schema: T) => {
  // oxlint-disable-next-line promise/prefer-await-to-then, promise/valid-params, unicorn/no-useless-undefined -- zod's `.catch()` substitutes a fallback value on invalid input, not a Promise
  return schema.optional().catch(undefined);
};

const sharedReportSearchSchema = z.object({
  console: optionalOrDefault(z.enum(CONSOLE_FILTER_VALUES)),
  cookie: z.string().optional(),
  detail: optionalOrDefault(z.enum(DETAIL_TABS)),
  errors: optionalOrDefault(z.boolean()),
  key: z.string().optional(),
  method: z.string().optional(),
  nq: z.string().optional(),
  q: z.string().optional(),
  req: optionalOrDefault(z.number().int().min(1)),
  steps: optionalOrDefault(z.enum(STEP_FILTER_VALUES)),
  storage: optionalOrDefault(z.enum(STORAGE_AREAS)),
  tab: optionalOrDefault(z.enum(REPORT_TABS)),
  type: optionalOrDefault(z.enum(NETWORK_TYPE_FILTERS)),
});

const SharedReportRoute = () => {
  const { reportId } = Route.useParams();
  return <SharedReportPage reportId={reportId} />;
};

export const Route = createFileRoute("/r/$reportId")({
  component: SharedReportRoute,
  validateSearch: sharedReportSearchSchema,
});
