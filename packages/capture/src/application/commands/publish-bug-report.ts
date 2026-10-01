import { CaptureDomainError } from "../../domain/capture-domain-error";
import { publishBugReport } from "../../domain/entities/bug-report";
import type { BugReportRepository } from "../../domain/repositories/bug-report-repository";
import type { ReportActivityRepository } from "../../domain/repositories/report-activity-repository";
import { parseReportId } from "../../domain/value-objects/report-id";
import type { ReportId } from "../../domain/value-objects/report-id";
import { parseReporterId } from "../../domain/value-objects/reporter-id";
import type { StoredVideo } from "../../domain/value-objects/stored-video";
import { okOr } from "../../shared/option";
import { ok } from "../../shared/result";
import type { Result } from "../../shared/result";
import type { VideoStorage } from "../ports/video-storage";

interface PublishBugReportDeps {
  reports: BugReportRepository;
  activities: ReportActivityRepository;
  storage: VideoStorage;
  generateActivityId: () => string;
  now: () => Date;
}

export interface PublishBugReportInput {
  reportId: string;
  actorId: string;
  video: StoredVideo;
}

export interface PublishBugReportOutput {
  reportId: ReportId;
}

/** Storage failures reject (VideoStorageError); domain failures resolve as `err`. */
export type PublishBugReportUseCase = (
  input: PublishBugReportInput
) => Promise<Result<PublishBugReportOutput, CaptureDomainError>>;

export const createPublishBugReport =
  (deps: PublishBugReportDeps): PublishBugReportUseCase =>
  async (input) => {
    const reportId = parseReportId(input.reportId);
    if (!reportId.ok) {
      return reportId;
    }
    const actorId = parseReporterId(input.actorId);
    if (!actorId.ok) {
      return actorId;
    }
    const existing = okOr(
      await deps.reports.findById(reportId.value),
      () =>
        new CaptureDomainError(
          "BUG_REPORT_NOT_FOUND",
          `No bug report with id ${input.reportId}`
        )
    );
    if (!existing.ok) {
      return existing;
    }
    const published = publishBugReport(
      existing.value,
      actorId.value,
      input.video
    );
    if (!published.ok) {
      return published;
    }
    await deps.reports.save(published.value);
    await deps.activities.save({
      actorId: actorId.value,
      createdAt: deps.now(),
      from: null,
      id: deps.generateActivityId(),
      kind: "published",
      reportId: published.value.id,
      to: null,
    });
    await deps.storage.shareWithAnyone({
      fileId: published.value.video.fileId,
      reporterId: actorId.value,
    });
    return ok({ reportId: published.value.id });
  };
