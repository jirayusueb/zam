import { orpc } from "@/shared/api/orpc";

export const reportCommentsQuery = (reportId: string) =>
  orpc.bugReport.listComments.queryOptions({ input: { reportId } });
