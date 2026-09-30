import { checkRules } from "../../shared/domain-rule";
import { ok } from "../../shared/result";
import type { Result } from "../../shared/result";
import { invalidBugReport } from "../capture-domain-error";
import type { CaptureDomainError } from "../capture-domain-error";

export const VIDEO_MIME_TYPE = "video/webm";
export const MAX_VIDEO_BYTES = 524_288_000;
export const MAX_RECORDING_DURATION_MS = 300_000;

export interface VideoRecording {
  mimeType: string;
  sizeBytes: number;
  durationMs: number;
  startedAt: Date;
}

export const parseVideoRecording = (
  recording: VideoRecording
): Result<VideoRecording, CaptureDomainError> => {
  const checked = checkRules(
    {
      holds: () => recording.mimeType === VIDEO_MIME_TYPE,
      violation: () =>
        invalidBugReport(`recording.mimeType must be ${VIDEO_MIME_TYPE}`),
    },
    {
      holds: () =>
        Number.isInteger(recording.sizeBytes) &&
        recording.sizeBytes >= 1 &&
        recording.sizeBytes <= MAX_VIDEO_BYTES,
      violation: () =>
        invalidBugReport(
          `recording.sizeBytes must be an integer in 1..${MAX_VIDEO_BYTES}`
        ),
    },
    {
      holds: () =>
        Number.isInteger(recording.durationMs) &&
        recording.durationMs >= 1 &&
        recording.durationMs <= MAX_RECORDING_DURATION_MS,
      violation: () =>
        invalidBugReport(
          `recording.durationMs must be an integer in 1..${MAX_RECORDING_DURATION_MS}`
        ),
    },
    {
      holds: () => !Number.isNaN(recording.startedAt.getTime()),
      violation: () =>
        invalidBugReport("recording.startedAt must be a valid Date"),
    }
  );
  return checked.ok ? ok(recording) : checked;
};
