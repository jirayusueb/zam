import { CaptureDomainError } from "../../domain/capture-domain-error";
import { parseReportId } from "../../domain/value-objects/report-id";
import { ok, err } from "../../shared/result";
import type { Result } from "../../shared/result";
import type { BugReportReadModel } from "../ports/bug-report-read-model";
import type { VideoStorage, VideoStream } from "../ports/video-storage";

interface StreamSharedBugReportVideoDeps {
  readModel: BugReportReadModel;
  storage: VideoStorage;
}

export interface StreamSharedBugReportVideoInput {
  reportId: string;
  range: string | null;
}

/** Storage failures reject (VideoStorageError); domain failures resolve as `err`. */
export type StreamSharedBugReportVideoUseCase = (
  input: StreamSharedBugReportVideoInput
) => Promise<Result<VideoStream, CaptureDomainError>>;

// ponytail: every Range request re-resolves the location and the reporter's Google token (2–3 DB reads); cache per isolate if playback latency matters.
export const createStreamSharedBugReportVideo =
  (deps: StreamSharedBugReportVideoDeps): StreamSharedBugReportVideoUseCase =>
  async (input) => {
    const reportId = parseReportId(input.reportId);
    if (!reportId.ok) {
      return reportId;
    }
    const location = await deps.readModel.findVideoLocation(reportId.value);
    if (!(location.some && location.value.videoFileId.some)) {
      return err(
        new CaptureDomainError(
          "BUG_REPORT_NOT_FOUND",
          `No uploaded video for bug report ${input.reportId}`
        )
      );
    }
    return ok(
      await deps.storage.openVideo({
        fileId: location.value.videoFileId.value,
        range: input.range,
        reporterId: location.value.reporterId,
      })
    );
  };
