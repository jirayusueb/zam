import type { CaptureDomainError } from "../../domain/capture-domain-error";
import { parseReportId } from "../../domain/value-objects/report-id";
import { ok } from "../../shared/result";
import type { Result } from "../../shared/result";
import type {
  CommentReadModel,
  CommentView,
} from "../ports/comment-read-model";

interface ListReportCommentsDeps {
  commentReadModel: CommentReadModel;
}

export interface ListReportCommentsInput {
  reportId: string;
}

export type ListReportCommentsUseCase = (
  input: ListReportCommentsInput
) => Promise<Result<CommentView[], CaptureDomainError>>;

export const createListReportComments =
  (deps: ListReportCommentsDeps): ListReportCommentsUseCase =>
  async (input) => {
    const reportId = parseReportId(input.reportId);
    if (!reportId.ok) {
      return reportId;
    }
    return ok(await deps.commentReadModel.listByReport(reportId.value));
  };
