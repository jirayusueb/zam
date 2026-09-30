import { keepPreviousData } from "@tanstack/react-query";
import type { ListMyBugReportsInput } from "@zam/capture/application/queries/list-my-bug-reports";

import { orpc } from "@/shared/api/orpc";

export const myBugReportsQuery = (
  input: Omit<ListMyBugReportsInput, "reporterId">
) =>
  orpc.bugReport.listMine.queryOptions({
    input,
    // Keep the current page visible while the next search/page loads.
    placeholderData: keepPreviousData,
  });

export const sharedBugReportQuery = (reportId: string) =>
  orpc.bugReport.getShared.queryOptions({ input: { reportId } });
