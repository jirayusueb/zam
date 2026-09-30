import type { DomainRule } from "../../shared/domain-rule";
import { invalidComment } from "../capture-domain-error";
import type { CaptureDomainError } from "../capture-domain-error";
import type { Comment } from "../entities/comment";
import type { ReportId } from "../value-objects/report-id";

export const replyMustTargetSameReport = (
  replyTo: Comment | null,
  reportId: ReportId
): DomainRule<CaptureDomainError> => ({
  holds: () => replyTo === null || replyTo.reportId === reportId,
  violation: () =>
    invalidComment("cannot reply to a comment on another report"),
});
