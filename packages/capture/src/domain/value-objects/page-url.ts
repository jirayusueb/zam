import { checkRules } from "../../shared/domain-rule";
import { ok } from "../../shared/result";
import type { Result } from "../../shared/result";
import type { ValueObject } from "../../shared/value-object";
import { invalidBugReport } from "../capture-domain-error";
import type { CaptureDomainError } from "../capture-domain-error";

export const MAX_URL_LENGTH = 2048;

export type PageUrl = ValueObject<string, "PageUrl">;

const HTTP_URL_REGEX = /^https?:/u;

export const parsePageUrl = (
  raw: string
): Result<PageUrl, CaptureDomainError> => {
  const checked = checkRules(
    {
      holds: () => raw.length <= MAX_URL_LENGTH,
      violation: () =>
        invalidBugReport(
          `pageUrl exceeds the maximum of ${MAX_URL_LENGTH} characters`
        ),
    },
    {
      holds: () => URL.canParse(raw) && HTTP_URL_REGEX.test(raw),
      violation: () =>
        invalidBugReport(`pageUrl must be an http(s) URL: ${raw}`),
    }
  );
  return checked.ok ? ok(raw as PageUrl) : checked;
};
