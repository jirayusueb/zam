import { checkRules } from "../../shared/domain-rule";
import { ok } from "../../shared/result";
import type { Result } from "../../shared/result";
import type { ValueObject } from "../../shared/value-object";
import { CaptureDomainError } from "../capture-domain-error";

export type ReportId = ValueObject<string, "ReportId">;

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

export const parseReportId = (
  raw: string
): Result<ReportId, CaptureDomainError> => {
  const checked = checkRules({
    holds: () => UUID_REGEX.test(raw),
    violation: () =>
      new CaptureDomainError(
        "BUG_REPORT_NOT_FOUND",
        `Not a valid report id: ${raw}`
      ),
  });
  return checked.ok ? ok(raw as ReportId) : checked;
};
