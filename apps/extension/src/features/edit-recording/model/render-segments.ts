import { VIDEO_MIME_TYPE } from "@zam/capture/domain/value-objects/video-recording";
import {
  AudioSampleSink,
  AudioSampleSource,
  BlobSource,
  BufferTarget,
  Input,
  Output,
  QUALITY_HIGH,
  VideoSampleSink,
  VideoSampleSource,
  WEBM,
  WebMOutputFormat,
} from "mediabunny";

import { keptDurationMs } from "./cut-ranges";
import type { KeptSegment } from "./cut-ranges";

const MS_PER_SECOND = 1000;

interface TimedSample {
  readonly timestamp: number;
  setTimestamp: (timestamp: number) => void;
  close: () => void;
}

/**
 * Streams each kept segment's decoded samples into `add`, retimed to the edited clock.
 * The sample straddling a segment start is pinned to it (video, so the segment opens on a frame)
 * or dropped (audio, where overlapping samples would double up sound).
 */
const copySegments = async <T extends TimedSample>(
  segments: readonly KeptSegment[],
  samples: (start: number, end: number) => AsyncGenerator<T>,
  add: (sample: T) => Promise<void>,
  straddling: "pin" | "drop",
  onSample?: (outputSeconds: number) => void
): Promise<void> => {
  for (const segment of segments) {
    const start = segment.startMs / MS_PER_SECOND;
    const outputStart = segment.outputStartMs / MS_PER_SECOND;
    // Sequential on purpose: samples must reach the encoder in order, and awaiting add() honors backpressure.
    // oxlint-disable-next-line no-await-in-loop
    for await (const sample of samples(start, segment.endMs / MS_PER_SECOND)) {
      try {
        if (sample.timestamp < start && straddling === "drop") {
          continue;
        }
        const outputSeconds =
          outputStart + Math.max(0, sample.timestamp - start);
        sample.setTimestamp(outputSeconds);
        // oxlint-disable-next-line no-await-in-loop
        await add(sample);
        onSample?.(outputSeconds);
      } finally {
        sample.close();
      }
    }
  }
};

const encodeKeptSegments = async (
  input: Input,
  segments: readonly KeptSegment[],
  onProgress: (fraction: number) => void
): Promise<Blob> => {
  const videoTrack = await input.getPrimaryVideoTrack();
  if (!(videoTrack?.codec && (await videoTrack.canDecode()))) {
    throw new Error("This browser can't decode the recording's video");
  }
  const audioTrack = await input.getPrimaryAudioTrack();
  const audio =
    audioTrack?.codec && (await audioTrack.canDecode())
      ? {
          sink: new AudioSampleSink(audioTrack),
          source: new AudioSampleSource({
            codec: audioTrack.codec,
            quality: QUALITY_HIGH,
          }),
        }
      : null;

  const target = new BufferTarget();
  const output = new Output({ format: new WebMOutputFormat(), target });
  const videoSink = new VideoSampleSink(videoTrack);
  const videoSource = new VideoSampleSource({
    codec: videoTrack.codec,
    quality: QUALITY_HIGH,
    // Window captures change size when the reporter resizes the window.
    sizeChangeBehavior: "contain",
  });
  output.addVideoTrack(videoSource);
  if (audio) {
    output.addAudioTrack(audio.source);
  }

  const totalSeconds = keptDurationMs(segments) / MS_PER_SECOND;
  try {
    await output.start();
    // Both tracks are fed concurrently so the muxer can interleave them.
    await Promise.all([
      copySegments(
        segments,
        (start, end) => videoSink.samples(start, end),
        (sample) => videoSource.add(sample),
        "pin",
        (outputSeconds) => {
          onProgress(Math.min(1, outputSeconds / totalSeconds));
        }
      ),
      audio
        ? copySegments(
            segments,
            (start, end) => audio.sink.samples(start, end),
            (sample) => audio.source.add(sample),
            "drop"
          )
        : null,
    ]);
    await output.finalize();
  } catch (error) {
    await output.cancel();
    throw error;
  }
  if (!target.buffer) {
    throw new Error("Editing produced no video");
  }
  return new Blob([target.buffer], { type: VIDEO_MIME_TYPE });
};

/** Re-encodes `video` keeping only `segments`, joined back to back. Runs on WebCodecs in the calling page. */
export const renderKeptSegments = async (
  video: Blob,
  segments: readonly KeptSegment[],
  onProgress: (fraction: number) => void
): Promise<Blob> => {
  const input = new Input({ formats: [WEBM], source: new BlobSource(video) });
  try {
    return await encodeKeptSegments(input, segments, onProgress);
  } finally {
    input.dispose();
  }
};
