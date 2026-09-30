import { checkRules } from "../../shared/domain-rule";
import { ok } from "../../shared/result";
import type { Result } from "../../shared/result";
import type { ValueObject } from "../../shared/value-object";
import { CaptureDomainError } from "../capture-domain-error";

export type CommentId = ValueObject<string, "CommentId">;

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

export const parseCommentId = (
  raw: string
): Result<CommentId, CaptureDomainError> => {
  const checked = checkRules({
    holds: () => UUID_REGEX.test(raw),
    violation: () =>
      new CaptureDomainError(
        "COMMENT_NOT_FOUND",
        `Not a valid comment id: ${raw}`
      ),
  });
  return checked.ok ? ok(raw as CommentId) : checked;
};
