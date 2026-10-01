import {
  CaptureDomainError,
  invalidBugReport,
} from "../../domain/capture-domain-error";
import { editBugReport } from "../../domain/entities/bug-report";
import type { BugReport } from "../../domain/entities/bug-report";
import type { ReportActivity } from "../../domain/entities/report-activity";
import type { BugReportRepository } from "../../domain/repositories/bug-report-repository";
import type { ReportActivityRepository } from "../../domain/repositories/report-activity-repository";
import { parseReportId } from "../../domain/value-objects/report-id";
import { parseReporterId } from "../../domain/value-objects/reporter-id";
import type {
  ReportPriority,
  ReportStatus,
} from "../../domain/value-objects/triage";
import { okOr } from "../../shared/option";
import { err, ok } from "../../shared/result";
import type { Result } from "../../shared/result";
import type { ReportParticipantReadModel } from "../ports/report-participant-read-model";

interface EditBugReportDeps {
  reports: BugReportRepository;
  activities: ReportActivityRepository;
  participants: ReportParticipantReadModel;
  generateActivityId: () => string;
  now: () => Date;
}

export interface EditBugReportInput {
  reportId: string;
  actorId: string;
  title?: string;
  description?: string;
  status?: ReportStatus;
  priority?: ReportPriority;
  assigneeId?: string | null;
  tags?: string[];
  metadata?: Record<string, string>;
}

export interface EditBugReportOutput {
  report: BugReport;
  activities: ReportActivity[];
}

export type EditBugReportUseCase = (
  input: EditBugReportInput
) => Promise<Result<EditBugReportOutput, CaptureDomainError>>;

export const createEditBugReport =
  (deps: EditBugReportDeps): EditBugReportUseCase =>
  async (input) => {
    const reportId = parseReportId(input.reportId);
    if (!reportId.ok) {
      return reportId;
    }
    const actorId = parseReporterId(input.actorId);
    if (!actorId.ok) {
      return actorId;
    }
    const report = okOr(
      await deps.reports.findById(reportId.value),
      () =>
        new CaptureDomainError(
          "BUG_REPORT_NOT_FOUND",
          `No bug report with id ${input.reportId}`
        )
    );
    if (!report.ok) {
      return report;
    }
    if (input.assigneeId !== undefined && input.assigneeId !== null) {
      const participants = await deps.participants.listByReport(reportId.value);
      const isParticipant = participants.some(
        (participant) => participant.id === input.assigneeId
      );
      if (!isParticipant) {
        return err(
          invalidBugReport(
            "assignee must be the reporter or a commenter on this report"
          )
        );
      }
    }
    const edited = editBugReport(
      report.value,
      actorId.value,
      {
        assigneeId: input.assigneeId,
        description: input.description,
        metadata: input.metadata,
        priority: input.priority,
        status: input.status,
        tags: input.tags,
        title: input.title,
      },
      { generateActivityId: deps.generateActivityId, now: deps.now }
    );
    if (!edited.ok) {
      return edited;
    }
    await deps.reports.save(edited.value.report);
    await Promise.all(
      edited.value.activities.map((activity) => deps.activities.save(activity))
    );
    return ok(edited.value);
  };
