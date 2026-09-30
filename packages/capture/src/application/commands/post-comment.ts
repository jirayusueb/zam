import { CaptureDomainError } from "../../domain/capture-domain-error";
import { postComment } from "../../domain/entities/comment";
import type { Comment } from "../../domain/entities/comment";
import type { BugReportRepository } from "../../domain/repositories/bug-report-repository";
import type { CommentRepository } from "../../domain/repositories/comment-repository";
import { parseAuthorId } from "../../domain/value-objects/author-id";
import { parseCommentId } from "../../domain/value-objects/comment-id";
import type { CommentId } from "../../domain/value-objects/comment-id";
import { parseReportId } from "../../domain/value-objects/report-id";
import { okOr } from "../../shared/option";
import { ok } from "../../shared/result";
import type { Result } from "../../shared/result";

interface PostCommentDeps {
  reports: BugReportRepository;
  comments: CommentRepository;
  generateCommentId: () => CommentId;
  now: () => Date;
}

export interface PostCommentInput {
  reportId: string;
  authorId: string;
  body: string;
  /** Comment being replied to; omit for a new thread. */
  replyToId?: string;
}

export interface PostCommentOutput {
  commentId: CommentId;
}

export type PostCommentUseCase = (
  input: PostCommentInput
) => Promise<Result<PostCommentOutput, CaptureDomainError>>;

const findReplyTarget = async (
  comments: CommentRepository,
  replyToId: string | undefined
): Promise<Result<Comment | null, CaptureDomainError>> => {
  if (replyToId === undefined) {
    return ok(null);
  }
  const id = parseCommentId(replyToId);
  if (!id.ok) {
    return id;
  }
  return okOr(
    await comments.findById(id.value),
    () =>
      new CaptureDomainError(
        "COMMENT_NOT_FOUND",
        `No comment with id ${replyToId}`
      )
  );
};

export const createPostComment =
  (deps: PostCommentDeps): PostCommentUseCase =>
  async (input) => {
    const reportId = parseReportId(input.reportId);
    if (!reportId.ok) {
      return reportId;
    }
    const authorId = parseAuthorId(input.authorId);
    if (!authorId.ok) {
      return authorId;
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
    const replyTo = await findReplyTarget(deps.comments, input.replyToId);
    if (!replyTo.ok) {
      return replyTo;
    }
    const posted = postComment(
      {
        authorId: authorId.value,
        body: input.body,
        replyTo: replyTo.value,
        reportId: reportId.value,
      },
      { id: deps.generateCommentId(), now: deps.now }
    );
    if (!posted.ok) {
      return posted;
    }
    await deps.comments.save(posted.value);
    return ok({ commentId: posted.value.id });
  };
