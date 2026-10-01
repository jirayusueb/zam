import type { Database } from "@zam/db";
import { reportActivity } from "@zam/db/schema/report-activity";

import type { ReportActivityRepository } from "../../domain/repositories/report-activity-repository";
import { reportActivityMapper } from "./mappers/report-activity-mapper";

export const createDrizzleReportActivityRepository = (
  db: Database
): ReportActivityRepository => ({
  save: async (activity) => {
    await db
      .insert(reportActivity)
      .values(reportActivityMapper.toPersistence(activity));
  },
});
