import { MAX_TITLE_LENGTH } from "@zam/capture/domain/value-objects/title";
import { Alert, AlertDescription, AlertTitle } from "@zam/ui/components/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@zam/ui/components/alert-dialog";
import { Button } from "@zam/ui/components/button";
import { Input } from "@zam/ui/components/input";
import { Kbd } from "@zam/ui/components/kbd";
import { Label } from "@zam/ui/components/label";
import { Progress } from "@zam/ui/components/progress";
import { Spinner } from "@zam/ui/components/spinner";
import { Scissors, Undo2, XIcon } from "lucide-react";
import {
  useEffect,
  useEffectEvent,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  cutDevtools,
  cutSteps,
  CutTimeline,
  evidenceCounts,
  keptDurationMs,
  keptSegments,
  renderKeptSegments,
  timelineMarkers,
} from "@/features/edit-recording";
import type { TimeRange } from "@/features/edit-recording";
import { publishReport } from "@/features/publish-report";
import {
  requestPendingRecording,
  sendExtensionMessage,
} from "@/shared/api/messages";
import type { PendingRecording } from "@/shared/api/messages";
import { openWebPage } from "@/shared/lib/open-web-page";

const MS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const PERCENT = 100;
/** Shorter edits are almost certainly a slip; the domain also rejects a zero-length recording. */
const MIN_KEPT_MS = 1000;
const NUDGE_MS = 1000;
const BIG_NUDGE_MS = 5000;
/** A new selection made from the playhead starts this long so it is visible and draggable. */
const DEFAULT_SELECTION_MS = 3000;

const formatTime = (ms: number): string => {
  const totalSeconds = ms / MS_PER_SECOND;
  const minutes = Math.floor(totalSeconds / SECONDS_PER_MINUTE);
  const seconds = (totalSeconds % SECONDS_PER_MINUTE).toFixed(1);
  return `${minutes}:${seconds.padStart(4, "0")}`;
};

const plural = (count: number, word: string) =>
  `${count} ${count === 1 ? word : `${word}s`}`;

type PublishState =
  | { kind: "idle" }
  | { kind: "cutting"; progress: number }
  | { kind: "uploading" }
  | { kind: "failed"; message: string; canRetry: boolean }
  /** Nothing was saved; the reporter re-grants Drive access on the web app, then publishes again. */
  | { kind: "needs-drive-access" };

type Selection = [number, number] | null;

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const isTyping = (target: EventTarget | null): boolean =>
  target instanceof HTMLElement &&
  (target.isContentEditable ||
    ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));

const SHORTCUTS: [string, string][] = [
  ["Space", "Play / pause"],
  ["← →", "Back / forward 1 s (Shift: 5 s)"],
  ["I", "Start selection here"],
  ["O", "End selection here"],
  ["X", "Cut selection"],
  ["Esc", "Clear selection"],
  ["⌘ Z", "Restore last cut"],
];

const ShortcutList = () => (
  <details className="text-muted-foreground text-xs">
    <summary className="hover:text-foreground cursor-pointer select-none">
      Keyboard shortcuts
    </summary>
    <dl className="mt-2 grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1.5">
      {SHORTCUTS.map(([keys, label]) => (
        <div className="contents" key={keys}>
          <dt>
            <Kbd>{keys}</Kbd>
          </dt>
          <dd>{label}</dd>
        </div>
      ))}
    </dl>
  </details>
);

const PublishStatus = ({ state }: { state: PublishState }) => {
  switch (state.kind) {
    case "cutting": {
      return (
        <div className="flex flex-col gap-1.5 text-sm">
          Removing cut parts… {Math.round(state.progress * PERCENT)}%
          <Progress value={Math.round(state.progress * PERCENT)} />
        </div>
      );
    }
    case "uploading": {
      return (
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <Spinner />
          Uploading to your Google Drive…
        </div>
      );
    }
    case "needs-drive-access": {
      return (
        <Alert>
          <AlertTitle>Zam needs access to your Google Drive</AlertTitle>
          <AlertDescription className="flex flex-col items-start gap-3">
            <p>
              The video goes to your own Google Drive, and Zam doesn’t have
              permission (never granted, or removed). Allow access in the tab
              that opens with the Google Drive box ticked, then press Publish
              report again. Your recording and cuts are kept.
            </p>
            <Button
              onClick={() => openWebPage("/connect-drive")}
              size="sm"
              variant="outline"
            >
              Allow Google Drive access
            </Button>
          </AlertDescription>
        </Alert>
      );
    }
    case "failed": {
      return (
        <Alert variant="destructive">
          <AlertTitle>
            {state.canRetry ? "Could not cut the video" : "Publishing failed"}
          </AlertTitle>
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      );
    }
    default: {
      return null;
    }
  }
};

const DiscardButton = ({ disabled }: { disabled: boolean }) => (
  <AlertDialog>
    <AlertDialogTrigger
      render={<Button disabled={disabled} variant="outline" />}
    >
      Discard
    </AlertDialogTrigger>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Discard this recording?</AlertDialogTitle>
        <AlertDialogDescription>
          The recording and its console and network logs exist only in this
          browser until you publish. Discarding deletes them for good.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Keep editing</AlertDialogCancel>
        <AlertDialogAction
          onClick={() => {
            void sendExtensionMessage({ type: "capture:discard" });
          }}
          variant="destructive"
        >
          Discard recording
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);

const Stat = ({
  label,
  total,
  value,
}: {
  label: string;
  total?: string | number;
  value: string | number;
}) => (
  <div className="flex items-baseline justify-between gap-3 py-1.5 text-sm">
    <dt className="text-muted-foreground">{label}</dt>
    <dd className="font-mono text-xs tabular-nums">
      {value}
      {total !== undefined && total !== value ? (
        <span className="text-muted-foreground"> / {total}</span>
      ) : null}
    </dd>
  </div>
);

interface ShortcutHandlers {
  togglePlay: () => void;
  nudge: (deltaMs: number) => void;
  markStart: () => void;
  markEnd: () => void;
  cut: () => void;
  clear: () => void;
  undo: () => void;
}

const shortcutAction = (
  event: KeyboardEvent,
  h: ShortcutHandlers
): (() => void) | undefined => {
  if (event.metaKey || event.ctrlKey) {
    return event.key === "z" ? h.undo : undefined;
  }
  const actions: Record<string, () => void> = {
    " ": h.togglePlay,
    ArrowLeft: () => h.nudge(event.shiftKey ? -BIG_NUDGE_MS : -NUDGE_MS),
    ArrowRight: () => h.nudge(event.shiftKey ? BIG_NUDGE_MS : NUDGE_MS),
    Escape: h.clear,
    i: h.markStart,
    o: h.markEnd,
    x: h.cut,
  };
  return actions[event.key.length === 1 ? event.key.toLowerCase() : event.key];
};

/** Global editor shortcuts; ignored while typing in a field or when a focused control owns the key. */
const useEditorShortcuts = (handlers: ShortcutHandlers) => {
  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (isTyping(event.target) || event.altKey) {
      return;
    }
    const action = shortcutAction(event, handlers);
    // Let focused buttons and the slider keep their own arrow/space handling.
    const focusedControl =
      event.target instanceof HTMLElement &&
      event.target.closest("button,[role=slider]") !== null &&
      [" ", "ArrowLeft", "ArrowRight"].includes(event.key);
    if (action && !focusedControl) {
      event.preventDefault();
      action();
    }
  });
  useEffect(() => {
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
};

const RecordingEditor = ({ recording }: { recording: PendingRecording }) => {
  const { durationMs, context } = recording;
  const titleId = useId();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [title, setTitle] = useState(context.title);
  const [cuts, setCuts] = useState<TimeRange[]>([]);
  const [selection, setSelection] = useState<Selection>(null);
  const [playheadMs, setPlayheadMs] = useState(0);
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
  const keptSteps = useMemo(
    () => cutSteps(context.steps, context.startedAt, segments),
    [context, segments]
  );
  const markers = useMemo(
    () => timelineMarkers(context.devtools, context.steps, context.startedAt),
    [context]
  );
  const before = evidenceCounts(context.devtools);
  const after = evidenceCounts(keptDevtools);
  const lostErrors = before.errors - after.errors;
  const lostFailed = before.failed - after.failed;

  const busy =
    publishState.kind === "cutting" || publishState.kind === "uploading";
  const trimmedTitle = title.trim();
  const blockedByFailure =
    publishState.kind === "failed" && !publishState.canRetry;
  const canPublish =
    !busy &&
    keptMs >= MIN_KEPT_MS &&
    trimmedTitle.length > 0 &&
    !blockedByFailure;

  const seek = (atMs: number) => {
    const clamped = Math.min(Math.max(atMs, 0), durationMs);
    setPlayheadMs(clamped);
    if (videoRef.current) {
      videoRef.current.currentTime = clamped / MS_PER_SECOND;
    }
  };

  // Preview the edit: playback jumps over cut ranges.
  const onTimeUpdate = () => {
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
      return;
    }
    setPlayheadMs(atMs);
  };

  const cutSelection = () => {
    if (!selection || busy || selection[1] <= selection[0]) {
      return;
    }
    setCuts((current) => [
      ...current,
      { endMs: selection[1], startMs: selection[0] },
    ]);
    setSelection(null);
  };

  useEditorShortcuts({
    clear: () => setSelection(null),
    cut: cutSelection,
    markEnd: () =>
      setSelection((current) => [
        Math.min(current?.[0] ?? 0, playheadMs),
        playheadMs,
      ]),
    markStart: () =>
      setSelection((current) => [
        playheadMs,
        Math.max(
          current?.[1] ??
            Math.min(playheadMs + DEFAULT_SELECTION_MS, durationMs),
          playheadMs
        ),
      ]),
    nudge: (deltaMs) => seek(playheadMs + deltaMs),
    togglePlay: () => {
      const video = videoRef.current;
      if (video) {
        void (video.paused ? video.play() : video.pause());
      }
    },
    undo: () => {
      if (!busy) {
        setCuts((current) => current.slice(0, -1));
      }
    },
  });

  const publish = async () => {
    let video: Blob;
    const named = { ...context, title: trimmedTitle };
    let edited = { context: named, durationMs };
    try {
      const response = await fetch(recording.videoUrl);
      video = await response.blob();
      if (cuts.length > 0) {
        setPublishState({ kind: "cutting", progress: 0 });
        video = await renderKeptSegments(video, segments, (progress) => {
          setPublishState({ kind: "cutting", progress });
        });
        edited = {
          context: { ...named, devtools: keptDevtools, steps: keptSteps },
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
    if (outcome.kind === "needs_drive_access") {
      setPublishState({ kind: "needs-drive-access" });
      await sendExtensionMessage({ type: "editor:publish-blocked" });
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

  return (
    <main className="mx-auto grid w-full max-w-[1400px] gap-6 p-5 md:p-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
      <section aria-label="Recording" className="flex min-w-0 flex-col gap-4">
        <header className="flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="font-display text-headline">Edit recording</h1>
          <p className="text-muted-foreground text-sm">
            Cut what the engineer shouldn’t see. Playback skips cut parts.
          </p>
        </header>

        {/* oxlint-disable-next-line jsx-a11y/media-has-caption -- screen recordings have no captions */}
        <video
          className="bg-foreground aspect-video w-full rounded-2xl"
          controls
          onSeeked={onTimeUpdate}
          onTimeUpdate={onTimeUpdate}
          ref={videoRef}
          src={recording.videoUrl}
        />

        <div className="bg-card flex flex-col gap-4 rounded-[20px] p-4 md:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                disabled={busy}
                onClick={() =>
                  setSelection([
                    playheadMs,
                    Math.min(playheadMs + DEFAULT_SELECTION_MS, durationMs),
                  ])
                }
                size="sm"
                variant="outline"
              >
                Select from playhead
              </Button>
              <Button
                disabled={busy || !selection}
                onClick={cutSelection}
                size="sm"
              >
                <Scissors aria-hidden />
                Cut selection
              </Button>
              {selection ? (
                <span className="font-mono text-xs tabular-nums">
                  {formatTime(selection[0])} – {formatTime(selection[1])}
                  <span className="text-muted-foreground">
                    {" "}
                    ({formatTime(selection[1] - selection[0])})
                  </span>
                </span>
              ) : null}
            </div>
            <span className="text-muted-foreground font-mono text-xs tabular-nums">
              {formatTime(playheadMs)} / {formatTime(durationMs)}
            </span>
          </div>

          <CutTimeline
            cuts={cuts}
            durationMs={durationMs}
            markers={markers}
            onSeek={seek}
            onSelectionChange={(next, movedMs) => {
              setSelection(next);
              seek(movedMs);
            }}
            playheadMs={playheadMs}
            selection={selection}
          />

          <p className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
            <span className="flex items-center gap-1.5">
              <span
                aria-hidden
                className="bg-destructive h-3 w-[2px] rounded-full"
              />
              Console error / failed request
            </span>
            <span className="flex items-center gap-1.5">
              <span
                aria-hidden
                className="bg-foreground/50 h-2 w-[2px] rounded-full"
              />
              Click
            </span>
            <span>Drag on the track to select · click to seek</span>
          </p>
        </div>
      </section>

      <aside
        aria-label="Report"
        className="bg-card flex flex-col gap-5 rounded-[20px] p-5 lg:sticky lg:top-6"
      >
        <div className="flex flex-col gap-2">
          <Label htmlFor={titleId}>Bug title</Label>
          <Input
            aria-invalid={trimmedTitle.length === 0}
            id={titleId}
            maxLength={MAX_TITLE_LENGTH}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="What went wrong?"
            value={title}
          />
          {context.pageUrl ? (
            <p className="text-muted-foreground truncate font-mono text-xs">
              {context.pageUrl}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-medium">In this report</h2>
          <dl className="divide-border divide-y">
            <Stat
              label="Video"
              total={formatTime(durationMs)}
              value={formatTime(keptMs)}
            />
            <Stat
              label="Console entries"
              total={context.devtools.console.length}
              value={keptDevtools.console.length}
            />
            <Stat
              label="Network requests"
              total={context.devtools.network.length}
              value={keptDevtools.network.length}
            />
            <Stat
              label="Steps"
              total={context.steps.length}
              value={keptSteps.length}
            />
          </dl>
          {lostErrors > 0 || lostFailed > 0 ? (
            <p className="text-destructive mt-1 text-xs">
              Your cuts remove{" "}
              {[
                lostErrors > 0 ? plural(lostErrors, "console error") : null,
                lostFailed > 0 ? plural(lostFailed, "failed request") : null,
              ]
                .filter(Boolean)
                .join(" and ")}
              . If that’s the bug, restore the cut.
            </p>
          ) : null}
          {keptMs < MIN_KEPT_MS ? (
            <p className="text-destructive mt-1 text-xs">
              Keep at least 1 second of video.
            </p>
          ) : null}
        </div>

        {cuts.length > 0 ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium">Cuts</h2>
              <Button
                disabled={busy}
                onClick={() => setCuts((current) => current.slice(0, -1))}
                size="xs"
                variant="ghost"
              >
                <Undo2 aria-hidden />
                Undo
              </Button>
            </div>
            <ul className="flex flex-col gap-1">
              {cuts.map((cut, index) => (
                <li
                  className="bg-muted/60 flex items-center justify-between gap-2 rounded-lg py-1 pr-1 pl-3 font-mono text-xs tabular-nums"
                  key={`${cut.startMs}-${cut.endMs}`}
                >
                  <button
                    className="hover:underline"
                    onClick={() => seek(cut.startMs)}
                    type="button"
                  >
                    {formatTime(cut.startMs)} – {formatTime(cut.endMs)}
                  </button>
                  <Button
                    aria-label={`Restore ${formatTime(cut.startMs)} – ${formatTime(cut.endMs)}`}
                    disabled={busy}
                    onClick={() =>
                      setCuts((current) =>
                        current.filter((_, i) => i !== index)
                      )
                    }
                    size="icon-xs"
                    variant="ghost"
                  >
                    <XIcon aria-hidden />
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <PublishStatus state={publishState} />

        <div className="flex gap-2">
          <DiscardButton disabled={busy} />
          <Button
            className="flex-1"
            disabled={!canPublish}
            onClick={() => {
              void publish();
            }}
          >
            {busy ? <Spinner /> : null}
            Publish report
          </Button>
        </div>
        <p className="text-muted-foreground -mt-2 text-xs">
          The video goes to your Google Drive; Zam keeps the logs and the link.
        </p>

        <ShortcutList />
      </aside>
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
