import type { Database } from "@zam/db";
import { comment } from "@zam/db/schema/comment";
import { eq } from "drizzle-orm";

import type { Comment } from "../../domain/entities/comment";
import type { CommentRepository } from "../../domain/repositories/comment-repository";
import { parseAuthorId } from "../../domain/value-objects/author-id";
import { parseCommentBody } from "../../domain/value-objects/comment-body";
import { parseCommentId } from "../../domain/value-objects/comment-id";
import type { CommentId } from "../../domain/value-objects/comment-id";
import { parseReportId } from "../../domain/value-objects/report-id";
import { none, some } from "../../shared/option";
import { unwrap } from "../../shared/result";

const toDomain = (row: typeof comment.$inferSelect): Comment => ({
  authorId: unwrap(parseAuthorId(row.authorId)),
  body: unwrap(parseCommentBody(row.body)),
  createdAt: row.createdAt,
  id: unwrap(parseCommentId(row.id)),
  parentId: row.parentId === null ? null : unwrap(parseCommentId(row.parentId)),
  reportId: unwrap(parseReportId(row.reportId)),
});

export const createDrizzleCommentRepository = (
  db: Database
): CommentRepository => ({
  findById: async (id: CommentId) => {
    const [row] = await db
      .select()
      .from(comment)
      .where(eq(comment.id, id))
      .limit(1);
    return row ? some(toDomain(row)) : none;
  },
  // Comments are immutable once posted.
  save: async (posted: Comment) => {
    await db.insert(comment).values(posted);
  },
});
