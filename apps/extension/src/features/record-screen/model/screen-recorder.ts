import {
  MAX_RECORDING_DURATION_MS,
  VIDEO_MIME_TYPE,
} from "@zam/capture/domain/value-objects/video-recording";
import fixWebmDuration from "fix-webm-duration";

export interface ScreenRecording {
  startedAt: number;
  stop: () => void;
  finished: Promise<{ video: Blob; durationMs: number }>;
}

const pickMimeType = (): string => {
  const preferred = "video/webm;codecs=vp9,opus";
  return MediaRecorder.isTypeSupported(preferred) ? preferred : "video/webm";
};

export const startScreenRecording =
  async (): Promise<ScreenRecording | null> => {
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getDisplayMedia({
        audio: true,
        video: true,
      });
    } catch (error) {
      if (error instanceof Error && error.name === "NotAllowedError") {
        return null;
      }
      throw error;
    }

    const startedAt = Date.now();
    const chunks: Blob[] = [];
    const recorder = new MediaRecorder(stream, { mimeType: pickMimeType() });
    recorder.addEventListener("dataavailable", (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data);
      }
    });

    const stop = () => {
      if (recorder.state !== "inactive") {
        recorder.stop();
      }
    };

    const maxDurationTimer = setTimeout(stop, MAX_RECORDING_DURATION_MS);

    // Bridges MediaRecorder's "stop" event to a promise; no existing promise-returning API covers this.
    // oxlint-disable-next-line promise/avoid-new
    const finished = new Promise<{ video: Blob; durationMs: number }>(
      (resolve) => {
        recorder.addEventListener("stop", async () => {
          clearTimeout(maxDurationTimer);
          for (const track of stream.getTracks()) {
            track.stop();
          }
          const durationMs = Math.min(
            Date.now() - startedAt,
            MAX_RECORDING_DURATION_MS
          );
          // MediaRecorder writes no Duration element; without it players report Infinity and can't scrub.
          const video = await fixWebmDuration(
            new Blob(chunks, { type: VIDEO_MIME_TYPE }),
            durationMs,
            { logger: false }
          );
          resolve({ durationMs, video });
        });
      }
    );

    // Chrome's "Stop sharing" bar ends the video track directly, bypassing our stop().
    const [videoTrack] = stream.getVideoTracks();
    videoTrack?.addEventListener("ended", stop);

    // ponytail: whole recording is buffered in memory, capped at MAX_RECORDING_DURATION_MS (5 min);
    // switch to chunked resumable upload during recording if longer captures are needed.
    recorder.start(1000);

    return { finished, startedAt, stop };
  };
