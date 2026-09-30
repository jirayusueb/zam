import { checkRules } from "../../shared/domain-rule";
import { ok } from "../../shared/result";
import type { Result } from "../../shared/result";
import type { ValueObject } from "../../shared/value-object";
import { invalidBugReport } from "../capture-domain-error";
import type { CaptureDomainError } from "../capture-domain-error";

export const MAX_TITLE_LENGTH = 200;

export type Title = ValueObject<string, "Title">;

/** Trims, then requires 1..MAX_TITLE_LENGTH characters. */
export const parseTitle = (raw: string): Result<Title, CaptureDomainError> => {
  const title = raw.trim();
  const checked = checkRules({
    holds: () => title.length >= 1 && title.length <= MAX_TITLE_LENGTH,
    violation: () =>
      invalidBugReport(
        `title must be 1..${MAX_TITLE_LENGTH} characters after trimming`
      ),
  });
  return checked.ok ? ok(title as Title) : checked;
};
