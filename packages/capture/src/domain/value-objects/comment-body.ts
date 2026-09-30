import { checkRules } from "../../shared/domain-rule";
import { ok } from "../../shared/result";
import type { Result } from "../../shared/result";
import type { ValueObject } from "../../shared/value-object";
import { invalidComment } from "../capture-domain-error";
import type { CaptureDomainError } from "../capture-domain-error";

export const MAX_COMMENT_LENGTH = 10_000;

/** Markdown source, trimmed. */
export type CommentBody = ValueObject<string, "CommentBody">;

export const parseCommentBody = (
  raw: string
): Result<CommentBody, CaptureDomainError> => {
  const body = raw.trim();
  const checked = checkRules({
    holds: () => body.length >= 1 && body.length <= MAX_COMMENT_LENGTH,
    violation: () =>
      invalidComment(
        `comment must be 1..${MAX_COMMENT_LENGTH} characters after trimming`
      ),
  });
  return checked.ok ? ok(body as CommentBody) : checked;
};
