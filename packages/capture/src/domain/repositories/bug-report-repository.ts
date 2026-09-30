import type { Option } from "../../shared/option";
import type { BugReport } from "../entities/bug-report";
import type { ReportId } from "../value-objects/report-id";

export interface BugReportRepository {
  save: (report: BugReport) => Promise<void>;
  findById: (id: ReportId) => Promise<Option<BugReport>>;
}
