import { checkRules } from "../../shared/domain-rule";
import type { Entity } from "../../shared/entity";
import { ok } from "../../shared/result";
import type { Result } from "../../shared/result";
import type { CaptureDomainError } from "../capture-domain-error";
import { replyMustTargetSameReport } from "../rules/comment-rules";
import type { AuthorId } from "../value-objects/author-id";
import { parseCommentBody } from "../value-objects/comment-body";
import type { CommentBody } from "../value-objects/comment-body";
import type { CommentId } from "../value-objects/comment-id";
import type { ReportId } from "../value-objects/report-id";

export interface Comment extends Entity<CommentId> {
  reportId: ReportId;
  authorId: AuthorId;
  /** Thread root; null for a top-level comment. */
  parentId: CommentId | null;
  body: CommentBody;
  createdAt: Date;
}

export interface PostCommentInput {
  reportId: ReportId;
  authorId: AuthorId;
  body: string;
  /** Comment being replied to, or null for a new thread. */
  replyTo: Comment | null;
}

/**
 * Threads are one level deep: replying to a reply joins the root's thread.
 * A reply must target a comment on the same report.
 */
export const postComment = (
  input: PostCommentInput,
  deps: { id: CommentId; now: () => Date }
): Result<Comment, CaptureDomainError> => {
  const body = parseCommentBody(input.body);
  if (!body.ok) {
    return body;
  }
  const { replyTo } = input;
  const checked = checkRules(
    replyMustTargetSameReport(replyTo, input.reportId)
  );
  if (!checked.ok) {
    return checked;
  }
  return ok({
    authorId: input.authorId,
    body: body.value,
    createdAt: deps.now(),
    id: deps.id,
    parentId: replyTo ? (replyTo.parentId ?? replyTo.id) : null,
    reportId: input.reportId,
  });
};
