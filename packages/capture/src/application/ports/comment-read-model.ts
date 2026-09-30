import type { CommentId } from "../../domain/value-objects/comment-id";
import type { ReportId } from "../../domain/value-objects/report-id";

export interface CommentAuthorView {
  name: string;
  image: string | null;
}

export interface CommentView {
  id: CommentId;
  parentId: CommentId | null;
  /** Markdown source. */
  body: string;
  createdAt: Date;
  author: CommentAuthorView;
}

export interface CommentReadModel {
  /** Oldest first, replies and roots interleaved; the client groups threads. */
  listByReport: (reportId: ReportId) => Promise<CommentView[]>;
}
