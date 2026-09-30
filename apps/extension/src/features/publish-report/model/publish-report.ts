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

export const publishReport = async ({
  video,
  durationMs,
  context,
}: PublishReportInput): Promise<CaptureOutcome> => {
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
