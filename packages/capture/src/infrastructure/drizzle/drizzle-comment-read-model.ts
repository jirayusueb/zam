import type { Database } from "@zam/db";
import { user } from "@zam/db/schema/auth";
import { comment } from "@zam/db/schema/comment";
import { asc, eq } from "drizzle-orm";

import type {
  CommentReadModel,
  CommentView,
} from "../../application/ports/comment-read-model";
import { parseCommentId } from "../../domain/value-objects/comment-id";
import type { ReportId } from "../../domain/value-objects/report-id";
import { unwrap } from "../../shared/result";

export const createDrizzleCommentReadModel = (
  db: Database
): CommentReadModel => ({
  listByReport: async (reportId: ReportId): Promise<CommentView[]> => {
    const rows = await db
      .select({
        authorImage: user.image,
        authorName: user.name,
        body: comment.body,
        createdAt: comment.createdAt,
        id: comment.id,
        parentId: comment.parentId,
      })
      .from(comment)
      .innerJoin(user, eq(user.id, comment.authorId))
      .where(eq(comment.reportId, reportId))
      .orderBy(asc(comment.createdAt), asc(comment.id));
    return rows.map((row) => ({
      author: { image: row.authorImage, name: row.authorName },
      body: row.body,
      createdAt: row.createdAt,
      id: unwrap(parseCommentId(row.id)),
      parentId:
        row.parentId === null ? null : unwrap(parseCommentId(row.parentId)),
    }));
  },
});
