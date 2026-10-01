import type { Database } from "@zam/db";
import { user } from "@zam/db/schema/auth";
import { reportActivity } from "@zam/db/schema/report-activity";
import { asc, eq } from "drizzle-orm";

import type { ReportActivityReadModel } from "../../application/ports/report-activity-read-model";
import type { ReportId } from "../../domain/value-objects/report-id";
import { reportActivityMapper } from "./mappers/report-activity-mapper";

export const createDrizzleReportActivityReadModel = (
  db: Database
): ReportActivityReadModel => ({
  listByReport: async (reportId: ReportId) => {
    const rows = await db
      .select({
        actorId: reportActivity.actorId,
        actorImage: user.image,
        actorName: user.name,
        createdAt: reportActivity.createdAt,
        from: reportActivity.from,
        id: reportActivity.id,
        kind: reportActivity.kind,
        to: reportActivity.to,
      })
      .from(reportActivity)
      .innerJoin(user, eq(user.id, reportActivity.actorId))
      .where(eq(reportActivity.reportId, reportId))
      .orderBy(asc(reportActivity.createdAt), asc(reportActivity.id));
    return rows.map(reportActivityMapper.toView);
  },
});
