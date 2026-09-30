import { publishReport } from "@/features/publish-report";
import { startScreenRecording } from "@/features/record-screen";
import type { ScreenRecording } from "@/features/record-screen";
import {
  isExtensionMessage,
  requestCaptureContext,
  sendExtensionMessage,
} from "@/shared/api/messages";

export const registerOffscreenRecorder = (): void => {
  let active: ScreenRecording | null = null;

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
    const outcome = await publishReport({ context, durationMs, video });
    const resultMessage =
      outcome.kind === "published"
        ? ({ reportId: outcome.reportId, type: "report:published" } as const)
        : ({
            message: outcome.message,
            reportId: outcome.reportId,
            type: "report:failed",
          } as const);
    await sendExtensionMessage(resultMessage);
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

  browser.runtime.onMessage.addListener((message) => {
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
    }
  });
};
