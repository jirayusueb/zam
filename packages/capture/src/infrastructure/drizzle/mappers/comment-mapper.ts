import type { comment } from "@zam/db/schema/comment";

import type { CommentView } from "../../../application/ports/comment-read-model";
import type { Comment } from "../../../domain/entities/comment";
import { parseAuthorId } from "../../../domain/value-objects/author-id";
import { parseCommentBody } from "../../../domain/value-objects/comment-body";
import { parseCommentId } from "../../../domain/value-objects/comment-id";
import { parseReportId } from "../../../domain/value-objects/report-id";
import { unwrap } from "../../../shared/result";

type CommentRow = typeof comment.$inferSelect;

export type CommentViewRow = Pick<
  CommentRow,
  "body" | "createdAt" | "id" | "parentId"
> & { authorName: string; authorImage: string | null };

/** Data Mapper: the only place that knows both the `comment` row and the domain/read shapes. */
export const commentMapper = {
  toDomain: (row: CommentRow): Comment => ({
    authorId: unwrap(parseAuthorId(row.authorId)),
    body: unwrap(parseCommentBody(row.body)),
    createdAt: row.createdAt,
    id: unwrap(parseCommentId(row.id)),
    parentId:
      row.parentId === null ? null : unwrap(parseCommentId(row.parentId)),
    reportId: unwrap(parseReportId(row.reportId)),
  }),

  toPersistence: (posted: Comment): typeof comment.$inferInsert => ({
    authorId: posted.authorId,
    body: posted.body,
    createdAt: posted.createdAt,
    id: posted.id,
    parentId: posted.parentId,
    reportId: posted.reportId,
  }),

  toView: (row: CommentViewRow): CommentView => ({
    author: { image: row.authorImage, name: row.authorName },
    body: row.body,
    createdAt: row.createdAt,
    id: unwrap(parseCommentId(row.id)),
    parentId:
      row.parentId === null ? null : unwrap(parseCommentId(row.parentId)),
  }),
};
