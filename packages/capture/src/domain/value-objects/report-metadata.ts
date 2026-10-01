import { checkRules } from "../../shared/domain-rule";
import { ok } from "../../shared/result";
import type { Result } from "../../shared/result";
import { invalidBugReport } from "../capture-domain-error";
import type { CaptureDomainError } from "../capture-domain-error";

/**
 * Custom key/value context: set by the page via `window.zam.setMetadata({...})`
 * during capture, or edited by the reporter on the report page.
 */
export type ReportMetadata = Readonly<Record<string, string>>;

export const EMPTY_METADATA: ReportMetadata = {};
export const MAX_METADATA_ENTRIES = 50;
export const MAX_METADATA_KEY_LENGTH = 100;
export const MAX_METADATA_VALUE_LENGTH = 1000;

export const parseReportMetadata = (
  metadata: Record<string, string>
): Result<ReportMetadata, CaptureDomainError> => {
  const entries = Object.entries(metadata);
  const checked = checkRules(
    {
      holds: () => entries.length <= MAX_METADATA_ENTRIES,
      violation: () =>
        invalidBugReport(
          `Metadata exceeds the maximum of ${MAX_METADATA_ENTRIES} entries`
        ),
    },
    {
      holds: () =>
        entries.every(
          ([key, value]) =>
            key.trim().length >= 1 &&
            key.length <= MAX_METADATA_KEY_LENGTH &&
            typeof value === "string" &&
            value.length <= MAX_METADATA_VALUE_LENGTH
        ),
      violation: () =>
        invalidBugReport(
          `Metadata keys must be 1-${MAX_METADATA_KEY_LENGTH} characters and values at most ${MAX_METADATA_VALUE_LENGTH}`
        ),
    }
  );
  return checked.ok ? ok(Object.freeze({ ...metadata })) : checked;
};
