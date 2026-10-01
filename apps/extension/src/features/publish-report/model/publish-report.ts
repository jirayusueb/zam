import { ORPCError } from "@orpc/client";
import { VIDEO_MIME_TYPE } from "@zam/capture/domain/value-objects/video-recording";
import fixWebmDuration from "fix-webm-duration";

import type { CaptureOutcome } from "@/entities/capture-session";
import type { CaptureContext } from "@/shared/api/messages";
import { orpc } from "@/shared/api/orpc";

export interface PublishReportInput {
  video: Blob;
  durationMs: number;
  context: CaptureContext;
}

const failed = (message: string, reportId: string | null): CaptureOutcome => ({
  kind: "failed",
  message,
  reportId,
});

const published = (reportId: string): CaptureOutcome => ({
  kind: "published",
  reportId,
});

/**
 * Drive access is missing or revoked (the API maps ACCESS_NOT_GRANTED to
 * PRECONDITION_FAILED). Raised by `draft` before anything is saved, so the
 * recording is intact: the editor offers re-granting access, then a retry.
 */
export type PublishOutcome =
  | CaptureOutcome
  | { kind: "needs_drive_access"; message: string };

const DRIVE_ACCESS_ERROR_CODE = "PRECONDITION_FAILED";

export const publishReport = async ({
  video,
  durationMs,
  context,
}: PublishReportInput): Promise<PublishOutcome> => {
  // MediaRecorder writes WebM without a Duration element: <video> reports Infinity and can't seek.
  const seekableVideo = await fixWebmDuration(video, durationMs, {
    logger: false,
  });
  let draft: { reportId: string; uploadUrl: string };
  try {
    draft = await orpc.bugReport.draft({
      devtools: {
        console: [...context.devtools.console],
        network: [...context.devtools.network],
      },
      environment: context.environment,
      metadata: { ...context.metadata },
      pageUrl: context.pageUrl,
      recording: {
        durationMs,
        mimeType: VIDEO_MIME_TYPE,
        sizeBytes: seekableVideo.size,
        startedAt: new Date(context.startedAt),
      },
      steps: [...context.steps],
      storage: {
        cookies: [...context.storage.cookies],
        localStorage: [...context.storage.localStorage],
        sessionStorage: [...context.storage.sessionStorage],
      },
      title: context.title,
    });
  } catch (error) {
    if (error instanceof ORPCError && error.code === DRIVE_ACCESS_ERROR_CODE) {
      return { kind: "needs_drive_access", message: error.message };
    }
    return failed(error instanceof Error ? error.message : String(error), null);
  }

  const { reportId, uploadUrl } = draft;

  let uploadResponse: Response;
  try {
    uploadResponse = await fetch(uploadUrl, {
      body: seekableVideo,
      method: "PUT",
    });
  } catch (error) {
    return failed(
      error instanceof Error ? error.message : String(error),
      reportId
    );
  }
  if (!uploadResponse.ok) {
    return failed(
      `Video upload to Google Drive failed (${uploadResponse.status})`,
      reportId
    );
  }

  const uploaded: unknown = await uploadResponse.json();
  const videoFileId =
    typeof uploaded === "object" &&
    uploaded !== null &&
    "id" in uploaded &&
    typeof uploaded.id === "string"
      ? uploaded.id
      : null;
  if (videoFileId === null) {
    return failed("Google Drive did not return a file id", reportId);
  }

  try {
    await orpc.bugReport.publish({ reportId, videoFileId });
  } catch (error) {
    return failed(
      error instanceof Error ? error.message : String(error),
      reportId
    );
  }

  return published(reportId);
};
