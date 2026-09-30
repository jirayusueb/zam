import type { Database } from "@zam/db";
import { bugReport } from "@zam/db/schema/bug-report";
import { eq } from "drizzle-orm";

import type { BugReport } from "../../domain/entities/bug-report";
import type { BugReportRepository } from "../../domain/repositories/bug-report-repository";
import type { ReportId } from "../../domain/value-objects/report-id";
import { none, some } from "../../shared/option";
import { bugReportMapper } from "./mappers/bug-report-mapper";

export const createDrizzleBugReportRepository = (
  db: Database
): BugReportRepository => ({
  findById: async (id: ReportId) => {
    const [row] = await db
      .select()
      .from(bugReport)
      .where(eq(bugReport.id, id))
      .limit(1);
    return row ? some(bugReportMapper.toDomain(row)) : none;
  },
  save: async (report: BugReport) => {
    const row = bugReportMapper.toPersistence(report);
    await db
      .insert(bugReport)
      .values(row)
      .onConflictDoUpdate({
        set: { videoFileId: row.videoFileId },
        target: bugReport.id,
      });
  },
});
