import type { BugReportRepository } from "../domain/repositories/bug-report-repository";
import type { CommentRepository } from "../domain/repositories/comment-repository";
import type { CommentId } from "../domain/value-objects/comment-id";
import type { ReportId } from "../domain/value-objects/report-id";
import type { DraftBugReportUseCase } from "./commands/draft-bug-report";
import { createDraftBugReport } from "./commands/draft-bug-report";
import type { PostCommentUseCase } from "./commands/post-comment";
import { createPostComment } from "./commands/post-comment";
import type { PublishBugReportUseCase } from "./commands/publish-bug-report";
import { createPublishBugReport } from "./commands/publish-bug-report";
import type { BugReportReadModel } from "./ports/bug-report-read-model";
import type { CommentReadModel } from "./ports/comment-read-model";
import type { VideoStorage } from "./ports/video-storage";
import type { ListMyBugReportsUseCase } from "./queries/list-my-bug-reports";
import { createListMyBugReports } from "./queries/list-my-bug-reports";
import type { ListReportCommentsUseCase } from "./queries/list-report-comments";
import { createListReportComments } from "./queries/list-report-comments";
import type { StreamSharedBugReportVideoUseCase } from "./queries/stream-shared-bug-report-video";
import { createStreamSharedBugReportVideo } from "./queries/stream-shared-bug-report-video";
import type { ViewSharedBugReportUseCase } from "./queries/view-shared-bug-report";
import { createViewSharedBugReport } from "./queries/view-shared-bug-report";

export interface CaptureDependencies {
  reports: BugReportRepository;
  readModel: BugReportReadModel;
  comments: CommentRepository;
  commentReadModel: CommentReadModel;
  storage: VideoStorage;
  generateReportId: () => ReportId;
  generateCommentId: () => CommentId;
  now: () => Date;
}

export interface CaptureUseCases {
  draftBugReport: DraftBugReportUseCase;
  publishBugReport: PublishBugReportUseCase;
  listMyBugReports: ListMyBugReportsUseCase;
  streamSharedBugReportVideo: StreamSharedBugReportVideoUseCase;
  viewSharedBugReport: ViewSharedBugReportUseCase;
  postComment: PostCommentUseCase;
  listReportComments: ListReportCommentsUseCase;
}

export const createCaptureUseCases = (
  deps: CaptureDependencies
): CaptureUseCases => ({
  draftBugReport: createDraftBugReport(deps),
  listMyBugReports: createListMyBugReports(deps),
  listReportComments: createListReportComments(deps),
  postComment: createPostComment(deps),
  publishBugReport: createPublishBugReport(deps),
  streamSharedBugReportVideo: createStreamSharedBugReportVideo(deps),
  viewSharedBugReport: createViewSharedBugReport(deps),
});
