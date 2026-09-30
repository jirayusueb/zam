import type { Option } from "../../shared/option";
import type { Comment } from "../entities/comment";
import type { CommentId } from "../value-objects/comment-id";

export interface CommentRepository {
  save: (comment: Comment) => Promise<void>;
  findById: (id: CommentId) => Promise<Option<Comment>>;
}
