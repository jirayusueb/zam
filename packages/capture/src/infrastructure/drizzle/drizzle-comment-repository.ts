import type { Database } from "@zam/db";
import { comment } from "@zam/db/schema/comment";
import { eq } from "drizzle-orm";

import type { Comment } from "../../domain/entities/comment";
import type { CommentRepository } from "../../domain/repositories/comment-repository";
import type { CommentId } from "../../domain/value-objects/comment-id";
import { none, some } from "../../shared/option";
import { commentMapper } from "./mappers/comment-mapper";

export const createDrizzleCommentRepository = (
  db: Database
): CommentRepository => ({
  findById: async (id: CommentId) => {
    const [row] = await db
      .select()
      .from(comment)
      .where(eq(comment.id, id))
      .limit(1);
    return row ? some(commentMapper.toDomain(row)) : none;
  },
  // Comments are immutable once posted.
  save: async (posted: Comment) => {
    await db.insert(comment).values(commentMapper.toPersistence(posted));
  },
});
