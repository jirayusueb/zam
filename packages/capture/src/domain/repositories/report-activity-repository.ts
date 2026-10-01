import type { ReportActivity } from "../entities/report-activity";

export interface ReportActivityRepository {
  save: (activity: ReportActivity) => Promise<void>;
}
