import type { CaptureUseCases } from "@zam/capture/application/capture-use-cases";
import { VideoStorageError } from "@zam/capture/application/ports/video-storage-error";

const HTTP_NOT_FOUND = 404;
const HTTP_BAD_GATEWAY = 502;

const TEXT_HEADERS = { "Content-Type": "text/plain; charset=utf-8" };

export const serveBugReportVideo = async (
  capture: CaptureUseCases,
  reportId: string,
  request: Request
): Promise<Response> => {
  try {
    const result = await capture.streamSharedBugReportVideo({
      range: request.headers.get("Range"),
      reportId,
    });
    if (!result.ok) {
      if (result.error.code !== "BUG_REPORT_NOT_FOUND") {
        throw result.error;
      }
      return new Response(result.error.message, {
        headers: TEXT_HEADERS,
        status: HTTP_NOT_FOUND,
      });
    }
    const video = result.value;
    const headers = new Headers({
      "Accept-Ranges": "bytes",
      "Cache-Control": "private, max-age=3600",
      "Content-Type": video.contentType,
    });
    if (video.contentLength !== null) {
      headers.set("Content-Length", video.contentLength);
    }
    if (video.contentRange !== null) {
      headers.set("Content-Range", video.contentRange);
    }
    return new Response(video.body, { headers, status: video.status });
  } catch (error) {
    if (!(error instanceof VideoStorageError)) {
      throw error;
    }
    return new Response(error.message, {
      headers: TEXT_HEADERS,
      status:
        error.code === "VIDEO_NOT_FOUND" ? HTTP_NOT_FOUND : HTTP_BAD_GATEWAY,
    });
  }
};
