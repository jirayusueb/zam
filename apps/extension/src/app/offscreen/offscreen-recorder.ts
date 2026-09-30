import { startScreenRecording } from "@/features/record-screen";
import type { ScreenRecording } from "@/features/record-screen";
import {
  isExtensionMessage,
  requestCaptureContext,
  sendExtensionMessage,
} from "@/shared/api/messages";
import type { PendingRecording } from "@/shared/api/messages";

export const registerOffscreenRecorder = (): void => {
  let active: ScreenRecording | null = null;
  // Lives until the capture controller closes this document (publish, failure, or discard),
  // which also revokes the blob URL.
  let pending: PendingRecording | null = null;

  const runRecording = async (): Promise<void> => {
    const recording = await startScreenRecording();
    if (!recording) {
      await sendExtensionMessage({ type: "recorder:cancelled" });
      return;
    }
    active = recording;
    await sendExtensionMessage({
      startedAt: recording.startedAt,
      type: "recorder:started",
    });

    const { video, durationMs } = await recording.finished;
    active = null;

    const context = await requestCaptureContext(durationMs);
    pending = { context, durationMs, videoUrl: URL.createObjectURL(video) };
    await sendExtensionMessage({ type: "recorder:ready" });
  };

  const runRecordingReportingErrors = async (): Promise<void> => {
    try {
      await runRecording();
    } catch (error) {
      active = null;
      // Unreported, the session stays "selecting"/"recording" and blocks every later capture.
      await sendExtensionMessage({
        message: error instanceof Error ? error.message : "Recording failed",
        reportId: null,
        type: "report:failed",
      });
    }
  };

  browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!isExtensionMessage(message)) {
      return;
    }
    if (message.type === "recorder:start") {
      if (active) {
        return;
      }
      void runRecordingReportingErrors();
    } else if (message.type === "recorder:stop") {
      active?.stop();
    } else if (message.type === "editor:load") {
      sendResponse(pending);
    }
  });
};
