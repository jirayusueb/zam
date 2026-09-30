import { Alert, AlertDescription, AlertTitle } from "@zam/ui/components/alert";
import { Badge } from "@zam/ui/components/badge";
import { Button } from "@zam/ui/components/button";
import { Progress } from "@zam/ui/components/progress";
import { Spinner } from "@zam/ui/components/spinner";
import { XIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  cutDevtools,
  cutSteps,
  CutTimeline,
  keptDurationMs,
  keptSegments,
  renderKeptSegments,
} from "@/features/edit-recording";
import type { TimeRange } from "@/features/edit-recording";
import { publishReport } from "@/features/publish-report";
import {
  requestPendingRecording,
  sendExtensionMessage,
} from "@/shared/api/messages";
import type { PendingRecording } from "@/shared/api/messages";

const MS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const PERCENT = 100;
/** Shorter edits are almost certainly a slip; the domain also rejects a zero-length recording. */
const MIN_KEPT_MS = 1000;

const formatTime = (ms: number): string => {
  const totalSeconds = ms / MS_PER_SECOND;
  const minutes = Math.floor(totalSeconds / SECONDS_PER_MINUTE);
  const seconds = (totalSeconds % SECONDS_PER_MINUTE).toFixed(1);
  return `${minutes}:${seconds.padStart(4, "0")}`;
};

type PublishState =
  | { kind: "idle" }
  | { kind: "cutting"; progress: number }
  | { kind: "uploading" }
  | { kind: "failed"; message: string; canRetry: boolean };

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const RecordingEditor = ({ recording }: { recording: PendingRecording }) => {
  const { durationMs, context } = recording;
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cuts, setCuts] = useState<TimeRange[]>([]);
  const [selection, setSelection] = useState<[number, number]>([0, durationMs]);
  const [publishState, setPublishState] = useState<PublishState>({
    kind: "idle",
  });

  const segments = useMemo(
    () => keptSegments(durationMs, cuts),
    [durationMs, cuts]
  );
  const keptMs = keptDurationMs(segments);
  const keptDevtools = useMemo(
    () => cutDevtools(context.devtools, context.startedAt, segments),
    [context, segments]
  );
  const busy =
    publishState.kind === "cutting" || publishState.kind === "uploading";

  // Preview the edit: playback jumps over cut ranges.
  const skipCuts = () => {
    const video = videoRef.current;
    if (!video) {
      return;
    }
    const atMs = video.currentTime * MS_PER_SECOND;
    const cut = cuts.find(
      ({ startMs, endMs }) => atMs >= startMs && atMs < endMs
    );
    if (cut) {
      video.currentTime = cut.endMs / MS_PER_SECOND;
    }
  };

  const publish = async () => {
    let video: Blob;
    let edited = { context, durationMs };
    try {
      const response = await fetch(recording.videoUrl);
      video = await response.blob();
      if (cuts.length > 0) {
        setPublishState({ kind: "cutting", progress: 0 });
        video = await renderKeptSegments(video, segments, (progress) => {
          setPublishState({ kind: "cutting", progress });
        });
        edited = {
          context: {
            ...context,
            devtools: keptDevtools,
            steps: cutSteps(context.steps, context.startedAt, segments),
          },
          durationMs: Math.round(keptMs),
        };
      }
    } catch (error) {
      // Nothing was sent yet: the recording is intact and the reporter can retry or publish uncut.
      setPublishState({
        canRetry: true,
        kind: "failed",
        message: errorMessage(error),
      });
      return;
    }

    setPublishState({ kind: "uploading" });
    await sendExtensionMessage({ type: "editor:publishing" });
    const outcome = await publishReport({ ...edited, video });
    if (outcome.kind === "published") {
      // The capture controller turns this tab into the report.
      await sendExtensionMessage({
        reportId: outcome.reportId,
        type: "report:published",
      });
      return;
    }
    setPublishState({
      canRetry: false,
      kind: "failed",
      message: outcome.message,
    });
    await sendExtensionMessage({
      message: outcome.message,
      reportId: outcome.reportId,
      type: "report:failed",
    });
  };

  const selectionMs = selection[1] - selection[0];

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-4 p-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-2xl">Edit recording</h1>
        <p className="text-muted-foreground text-sm">
          {context.title}. Select a range and cut it; cut parts are removed
          before the video is uploaded to your Google Drive.
        </p>
      </header>

      {/* oxlint-disable-next-line jsx-a11y/media-has-caption -- screen recordings have no captions */}
      <video
        className="bg-foreground aspect-video w-full rounded-md"
        controls
        onTimeUpdate={skipCuts}
        ref={videoRef}
        src={recording.videoUrl}
      />

      <CutTimeline
        cuts={cuts}
        durationMs={durationMs}
        onSelectionChange={(next, movedMs) => {
          setSelection(next);
          if (videoRef.current) {
            videoRef.current.currentTime = movedMs / MS_PER_SECOND;
          }
        }}
        selection={selection}
      />

      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-sm tabular-nums">
          {formatTime(selection[0])} – {formatTime(selection[1])}
        </span>
        <Button
          disabled={busy || selectionMs <= 0}
          onClick={() => {
            setCuts((current) => [
              ...current,
              { endMs: selection[1], startMs: selection[0] },
            ]);
          }}
          variant="outline"
        >
          Cut selection
        </Button>
        {cuts.map((cut, index) => (
          <Badge key={`${cut.startMs}-${cut.endMs}`} variant="secondary">
            {formatTime(cut.startMs)} – {formatTime(cut.endMs)}
            <button
              aria-label={`Restore ${formatTime(cut.startMs)} – ${formatTime(cut.endMs)}`}
              disabled={busy}
              onClick={() => {
                setCuts((current) => current.filter((_, i) => i !== index));
              }}
              type="button"
            >
              <XIcon className="size-3" />
            </button>
          </Badge>
        ))}
      </div>

      <p className="text-muted-foreground text-sm">
        Final video {formatTime(keptMs)} of {formatTime(durationMs)} ·{" "}
        {keptDevtools.console.length} of {context.devtools.console.length}{" "}
        console entries · {keptDevtools.network.length} of{" "}
        {context.devtools.network.length} network requests
      </p>

      {publishState.kind === "cutting" ? (
        <div className="flex flex-col gap-1 text-sm">
          Cutting video…
          <Progress value={Math.round(publishState.progress * PERCENT)} />
        </div>
      ) : null}
      {publishState.kind === "uploading" ? (
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <Spinner />
          Uploading to Google Drive…
        </div>
      ) : null}
      {publishState.kind === "failed" ? (
        <Alert variant="destructive">
          <AlertTitle>
            {publishState.canRetry
              ? "Could not cut the video"
              : "Publishing failed"}
          </AlertTitle>
          <AlertDescription>{publishState.message}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex justify-end gap-2">
        <Button
          disabled={busy}
          onClick={() => {
            void sendExtensionMessage({ type: "capture:discard" });
          }}
          variant="ghost"
        >
          Discard
        </Button>
        <Button
          disabled={
            busy ||
            keptMs < MIN_KEPT_MS ||
            (publishState.kind === "failed" && !publishState.canRetry)
          }
          onClick={() => {
            void publish();
          }}
        >
          Publish report
        </Button>
      </div>
    </main>
  );
};

export const EditorPage = () => {
  // undefined while loading; null when there is no recording to edit.
  const [recording, setRecording] = useState<PendingRecording | null>();

  useEffect(() => {
    void (async () => {
      setRecording(await requestPendingRecording().catch(() => null));
    })();
  }, []);

  if (recording === undefined) {
    return (
      <div className="text-muted-foreground flex items-center gap-2 p-6 text-sm">
        <Spinner />
        Loading recording…
      </div>
    );
  }
  if (recording === null) {
    return (
      <main className="mx-auto max-w-xl p-6">
        <Alert>
          <AlertTitle>No recording to edit</AlertTitle>
          <AlertDescription>
            It was published or discarded. Start a new capture from the Zam
            toolbar button.
          </AlertDescription>
        </Alert>
      </main>
    );
  }
  return <RecordingEditor recording={recording} />;
};
