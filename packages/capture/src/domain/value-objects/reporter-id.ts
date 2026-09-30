import { checkRules } from "../../shared/domain-rule";
import { ok } from "../../shared/result";
import type { Result } from "../../shared/result";
import type { ValueObject } from "../../shared/value-object";
import { CaptureDomainError } from "../capture-domain-error";

export type ReporterId = ValueObject<string, "ReporterId">;

export const parseReporterId = (
  raw: string
): Result<ReporterId, CaptureDomainError> => {
  const checked = checkRules({
    holds: () => raw.length > 0,
    violation: () =>
      new CaptureDomainError(
        "BUG_REPORT_ACCESS_DENIED",
        "Reporter id must not be empty"
      ),
  });
  return checked.ok ? ok(raw as ReporterId) : checked;
};
