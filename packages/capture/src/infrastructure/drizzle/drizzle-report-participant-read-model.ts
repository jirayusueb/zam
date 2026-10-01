import type { Database } from "@zam/db";
import { user } from "@zam/db/schema/auth";
import { bugReport } from "@zam/db/schema/bug-report";
import { comment } from "@zam/db/schema/comment";
import { eq } from "drizzle-orm";

import type {
  ReportParticipantReadModel,
  ReportParticipantView,
} from "../../application/ports/report-participant-read-model";
import type { ReportId } from "../../domain/value-objects/report-id";

export const createDrizzleReportParticipantReadModel = (
  db: Database
): ReportParticipantReadModel => ({
  listByReport: async (reportId: ReportId) => {
    const [reporterRows, commentAuthorRows] = await db.batch([
      db
        .select({
          id: bugReport.reporterId,
          image: user.image,
          name: user.name,
        })
        .from(bugReport)
        .innerJoin(user, eq(user.id, bugReport.reporterId))
        .where(eq(bugReport.id, reportId))
        .limit(1),
      db
        .selectDistinctOn([comment.authorId], {
          id: comment.authorId,
          image: user.image,
          name: user.name,
        })
        .from(comment)
        .innerJoin(user, eq(user.id, comment.authorId))
        .where(eq(comment.reportId, reportId)),
    ]);
    const byId = new Map<string, ReportParticipantView>();
    for (const row of reporterRows) {
      byId.set(row.id, {
        id: row.id,
        image: row.image,
        isReporter: true,
        name: row.name,
      });
    }
    for (const row of commentAuthorRows) {
      if (!byId.has(row.id)) {
        byId.set(row.id, {
          id: row.id,
          image: row.image,
          isReporter: false,
          name: row.name,
        });
      }
    }
    return [...byId.values()];
  },
});
