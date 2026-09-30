import { checkRules } from "../../shared/domain-rule";
import { ok } from "../../shared/result";
import type { Result } from "../../shared/result";
import type { ValueObject } from "../../shared/value-object";
import { CaptureDomainError } from "../capture-domain-error";

export type AuthorId = ValueObject<string, "AuthorId">;

export const parseAuthorId = (
  raw: string
): Result<AuthorId, CaptureDomainError> => {
  const checked = checkRules({
    holds: () => raw.length > 0,
    violation: () =>
      new CaptureDomainError(
        "BUG_REPORT_ACCESS_DENIED",
        "Author id must not be empty"
      ),
  });
  return checked.ok ? ok(raw as AuthorId) : checked;
};
