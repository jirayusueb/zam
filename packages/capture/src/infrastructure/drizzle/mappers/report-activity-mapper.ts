import type { reportActivity } from "@zam/db/schema/report-activity";

import type { ReportActivityView } from "../../../application/ports/report-activity-read-model";
import type {
  ReportActivity,
  ReportActivityKind,
} from "../../../domain/entities/report-activity";

type ReportActivityRow = typeof reportActivity.$inferSelect;

export type ReportActivityViewRow = Pick<
  ReportActivityRow,
  "createdAt" | "from" | "id" | "kind" | "to"
> & { actorName: string; actorImage: string | null; actorId: string };

/** Data Mapper: the only place that knows both the `report_activity` row and the domain/read shapes. */
export const reportActivityMapper = {
  toPersistence: (
    activity: ReportActivity
  ): typeof reportActivity.$inferInsert => ({
    actorId: activity.actorId,
    createdAt: activity.createdAt,
    from: activity.from,
    id: activity.id,
    kind: activity.kind,
    reportId: activity.reportId,
    to: activity.to,
  }),

  toView: (row: ReportActivityViewRow): ReportActivityView => ({
    actor: { id: row.actorId, image: row.actorImage, name: row.actorName },
    createdAt: row.createdAt,
    from: row.from,
    id: row.id,
    kind: row.kind as ReportActivityKind,
    to: row.to,
  }),
};
