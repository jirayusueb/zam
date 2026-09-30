import { checkRules } from "../../shared/domain-rule";
import type { Entity } from "../../shared/entity";
import { ok } from "../../shared/result";
import type { Result } from "../../shared/result";
import type { CaptureDomainError } from "../capture-domain-error";
import {
  onlyReporterMayPublish,
  publishOnlyOnce,
} from "../rules/bug-report-rules";
import { parseDevtoolsSnapshot } from "../value-objects/devtools-snapshot";
import type { DevtoolsSnapshot } from "../value-objects/devtools-snapshot";
import { parsePageUrl } from "../value-objects/page-url";
import type { PageUrl } from "../value-objects/page-url";
import type { ReportId } from "../value-objects/report-id";
import type { ReporterId } from "../value-objects/reporter-id";
import { parseStoredVideo } from "../value-objects/stored-video";
import type { StoredVideo } from "../value-objects/stored-video";
import { parseTitle } from "../value-objects/title";
import type { Title } from "../value-objects/title";
import { parseVideoRecording } from "../value-objects/video-recording";
import type { VideoRecording } from "../value-objects/video-recording";

export type BugReportStatus = "draft" | "published";

interface BaseBugReport extends Entity<ReportId> {
  reporterId: ReporterId;
  title: Title;
  pageUrl: PageUrl | null;
  recording: VideoRecording;
  devtools: DevtoolsSnapshot;
  createdAt: Date;
}

export interface DraftBugReport extends BaseBugReport {
  status: "draft";
  video: null;
}

export interface PublishedBugReport extends BaseBugReport {
  status: "published";
  video: StoredVideo;
}

export type BugReport = DraftBugReport | PublishedBugReport;

export interface DraftBugReportInput {
  reporterId: ReporterId;
  title: string;
  pageUrl: string | null;
  recording: VideoRecording;
  devtools: DevtoolsSnapshot;
}

export const draftBugReport = (
  input: DraftBugReportInput,
  deps: { id: ReportId; now: () => Date }
): Result<DraftBugReport, CaptureDomainError> => {
  const title = parseTitle(input.title);
  if (!title.ok) {
    return title;
  }
  const pageUrl =
    input.pageUrl === null ? ok(null) : parsePageUrl(input.pageUrl);
  if (!pageUrl.ok) {
    return pageUrl;
  }
  const recording = parseVideoRecording(input.recording);
  if (!recording.ok) {
    return recording;
  }
  const devtools = parseDevtoolsSnapshot(input.devtools);
  if (!devtools.ok) {
    return devtools;
  }
  return ok({
    createdAt: deps.now(),
    devtools: devtools.value,
    id: deps.id,
    pageUrl: pageUrl.value,
    recording: recording.value,
    reporterId: input.reporterId,
    status: "draft",
    title: title.value,
    video: null,
  });
};

export const publishBugReport = (
  report: BugReport,
  actorId: ReporterId,
  video: StoredVideo
): Result<PublishedBugReport, CaptureDomainError> => {
  const checked = checkRules(
    onlyReporterMayPublish(report, actorId),
    publishOnlyOnce(report)
  );
  if (!checked.ok) {
    return checked;
  }
  const stored = parseStoredVideo(video);
  if (!stored.ok) {
    return stored;
  }
  return ok({ ...report, status: "published", video: stored.value });
};
