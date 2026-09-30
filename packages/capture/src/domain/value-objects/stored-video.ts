import { checkRules } from "../../shared/domain-rule";
import { ok } from "../../shared/result";
import type { Result } from "../../shared/result";
import { invalidBugReport } from "../capture-domain-error";
import type { CaptureDomainError } from "../capture-domain-error";

export interface StoredVideo {
  fileId: string;
}

export const parseStoredVideo = (
  raw: StoredVideo
): Result<StoredVideo, CaptureDomainError> => {
  const checked = checkRules({
    holds: () => raw.fileId.length > 0,
    violation: () => invalidBugReport("video.fileId must not be empty"),
  });
  return checked.ok ? ok(raw) : checked;
};
