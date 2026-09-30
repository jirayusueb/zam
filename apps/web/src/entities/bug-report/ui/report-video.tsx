import {
  Gesture,
  MediaPlayer,
  MediaProvider,
  TimeSlider,
  useMediaRemote,
  useMediaState,
} from "@vidstack/react";
import type { DevtoolsSnapshot } from "@zam/capture/domain/value-objects/devtools-snapshot";
import { VIDEO_MIME_TYPE } from "@zam/capture/domain/value-objects/video-recording";
import { cn } from "@zam/ui/lib/utils";
import {
  CircleAlert,
  LoaderCircle,
  Maximize,
  Minimize,
  Pause,
  Play,
  Volume2,
  VolumeX,
} from "lucide-react";

import { formatOffset } from "../lib/format-offset";
import { isProblemMarker, timelineMarkers } from "../lib/timeline-markers";
import type { TimelineMarker } from "../lib/timeline-markers";
import { useReportPlayback } from "../model/report-playback-context";

const MS_PER_SECOND = 1000;
const PERCENT = 100;
/** Jumps land a beat before the error so the lead-up is visible. */
const PRE_ROLL_MS = 1000;
/** Treat the marker under the playhead as already seen when looking for the next one. */
const NEXT_MARKER_SLACK_MS = 250;
const PLAYBACK_RATES = [1, 1.5, 2, 0.5] as const;

/*
 * The frame is a media surface: dark in both themes, so its colours are fixed
 * rather than theme tokens. Contrast on #080808: text #cfcdcb 12.6:1,
 * error #ff6b5e 7.2:1, warning #c5d357 12.2:1.
 */
const MARKER_DOT: Record<TimelineMarker["kind"], string> = {
  error: "bg-[#ff6b5e]",
  failed: "bg-[#ff6b5e] ring-2 ring-[#ff6b5e]/35",
  warn: "bg-[#c5d357]",
};
const MARKER_NAME: Record<TimelineMarker["kind"], string> = {
  error: "Console error",
  failed: "Failed request",
  warn: "Console warning",
};

const CONTROL =
  "inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-[#f0f0ee] transition-colors duration-300 ease-intent hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-[#ddec61] focus-visible:outline-offset-1 disabled:opacity-40 [&_svg]:size-4.5";

const Scrubber = ({
  markers,
  durationMs,
  onJump,
}: {
  markers: TimelineMarker[];
  durationMs: number;
  onJump: (atMs: number) => void;
}) => {
  const span = Math.max(durationMs, 1);

  return (
    <div className="relative flex h-6 items-center">
      <TimeSlider.Root className="group/slider relative flex h-6 w-full cursor-pointer touch-none items-center outline-none select-none">
        <TimeSlider.Track className="ease-intent relative h-1 w-full rounded-full bg-white/15 transition-[height] duration-200 group-data-[active]/slider:h-1.5">
          <TimeSlider.Progress className="absolute inset-y-0 left-0 w-(--slider-progress) rounded-full bg-white/20" />
          <TimeSlider.TrackFill className="absolute inset-y-0 left-0 w-(--slider-fill) rounded-full bg-[#f0f0ee]" />
        </TimeSlider.Track>
        <TimeSlider.Thumb className="absolute top-1/2 left-(--slider-fill) size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#f0f0ee] opacity-0 shadow-[0_1px_4px_#00000080] transition-opacity duration-200 group-data-[active]/slider:opacity-100 group-data-[focus]/slider:opacity-100 group-data-[focus]/slider:outline-2 group-data-[focus]/slider:outline-offset-2 group-data-[focus]/slider:outline-[#ddec61]" />
        <TimeSlider.Preview className="pointer-events-none flex flex-col items-center opacity-0 transition-opacity duration-150 data-[visible]:opacity-100">
          <TimeSlider.Value className="mb-2 rounded-md bg-[#f0f0ee] px-1.5 py-0.5 font-mono text-[11px] text-[#080808] tabular-nums" />
        </TimeSlider.Preview>
      </TimeSlider.Root>
      {/* Evidence markers ride on the scrubber: the timeline and the video are one control. */}
      {markers.map((marker, index) => (
        // Plain button + CSS label: a base-ui Tooltip trigger here swallowed real pointer presses.
        <button
          aria-label={`${MARKER_NAME[marker.kind]} at ${formatOffset(marker.at)}: ${marker.label}`}
          className="group/marker absolute top-1/2 flex size-4 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full outline-none focus-visible:outline-2 focus-visible:outline-[#ddec61]"
          key={`${marker.at}-${index}`}
          onClick={() => onJump(marker.at)}
          style={{
            left: `${Math.min(Math.max(marker.at / span, 0), 1) * PERCENT}%`,
          }}
          type="button"
        >
          <span
            className={cn(
              "ease-intent size-2 rounded-full transition-transform duration-200 group-hover/marker:scale-150 group-focus-visible/marker:scale-150",
              MARKER_DOT[marker.kind]
            )}
          />
          <span
            aria-hidden
            className="pointer-events-none absolute bottom-full left-1/2 mb-2 hidden w-max max-w-72 -translate-x-1/2 flex-col gap-0.5 rounded-lg bg-[#f0f0ee] px-2.5 py-1.5 text-left font-mono text-[11px] leading-snug text-[#080808] shadow-[0_8px_24px_#00000059] group-hover/marker:flex group-focus-visible/marker:flex"
          >
            <span className="text-[#525250]">
              {formatOffset(marker.at)} · {MARKER_NAME[marker.kind]}
            </span>
            <span className="line-clamp-2">{marker.label}</span>
          </span>
        </button>
      ))}
    </div>
  );
};

const ControlBar = ({
  markers,
  durationMs,
  onJump,
}: {
  markers: TimelineMarker[];
  durationMs: number;
  onJump: (atMs: number) => void;
}) => {
  const remote = useMediaRemote();
  const paused = useMediaState("paused");
  const muted = useMediaState("muted");
  const fullscreen = useMediaState("fullscreen");
  const canFullscreen = useMediaState("canFullscreen");
  const playbackRate = useMediaState("playbackRate");
  const currentMs = useMediaState("currentTime") * MS_PER_SECOND;

  const problems = markers.filter(isProblemMarker);
  const next =
    problems.find(
      (marker) => marker.at - PRE_ROLL_MS > currentMs + NEXT_MARKER_SLACK_MS
    ) ?? problems[0];
  const nextRate =
    PLAYBACK_RATES[
      (PLAYBACK_RATES.indexOf(playbackRate as (typeof PLAYBACK_RATES)[number]) +
        1) %
        PLAYBACK_RATES.length
    ];

  return (
    <div className="flex flex-col gap-1 px-2.5 pt-1.5 pb-1.5">
      <Scrubber durationMs={durationMs} markers={markers} onJump={onJump} />
      <div className="flex items-center gap-1">
        <button
          aria-label={paused ? "Play" : "Pause"}
          className={CONTROL}
          onClick={() => remote.togglePaused()}
          type="button"
        >
          {paused ? <Play aria-hidden /> : <Pause aria-hidden />}
        </button>
        <span className="px-1.5 font-mono text-xs whitespace-nowrap text-[#cfcdcb] tabular-nums">
          <span className="text-[#f0f0ee]">{formatOffset(currentMs)}</span> /{" "}
          {formatOffset(durationMs)}
        </span>
        {next ? (
          <button
            className={cn(
              CONTROL,
              "ml-1 w-auto gap-1.5 px-2.5 text-xs font-medium"
            )}
            onClick={() => onJump(next.at)}
            type="button"
          >
            <CircleAlert aria-hidden className="text-[#ff6b5e]" />
            {/* Phones: icon + time only; the words stay for screen readers. */}
            <span className="max-sm:sr-only">
              {problems.length === 1 ? "Jump to error" : "Next error"}
            </span>
            <span className="font-mono text-[#cfcdcb] tabular-nums">
              {formatOffset(next.at)}
            </span>
          </button>
        ) : null}
        <span className="flex-1" />
        <button
          aria-label={`Playback speed ${playbackRate}×, change to ${nextRate}×`}
          // Hidden on phones, where the control row runs out of width first.
          className={cn(
            CONTROL,
            "w-12 font-mono text-xs tabular-nums max-sm:hidden"
          )}
          onClick={() => remote.changePlaybackRate(nextRate)}
          type="button"
        >
          {playbackRate}×
        </button>
        <button
          aria-label={muted ? "Unmute" : "Mute"}
          className={CONTROL}
          onClick={() => remote.toggleMuted()}
          type="button"
        >
          {muted ? <VolumeX aria-hidden /> : <Volume2 aria-hidden />}
        </button>
        <button
          aria-label={fullscreen ? "Exit full screen" : "Full screen"}
          className={CONTROL}
          disabled={!canFullscreen}
          onClick={() => remote.toggleFullscreen()}
          type="button"
        >
          {fullscreen ? <Minimize aria-hidden /> : <Maximize aria-hidden />}
        </button>
      </div>
    </div>
  );
};

/** Big play affordance before first play; spinner while buffering; message when Drive can't serve the file. */
const StageOverlay = () => {
  const remote = useMediaRemote();
  const started = useMediaState("started");
  const waiting = useMediaState("waiting");
  const canPlay = useMediaState("canPlay");
  const error = useMediaState("error");

  if (error) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-[#080808]/85 p-6 text-center">
        <p className="text-sm font-medium text-[#f0f0ee]">
          The video can’t be played right now
        </p>
        <p className="max-w-sm text-xs text-[#cfcdcb]">
          Google Drive can take a few minutes to process a new recording. Try
          again shortly; the console and network logs are available now.
        </p>
      </div>
    );
  }
  if (waiting || !canPlay) {
    return (
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <LoaderCircle
          aria-label="Loading video"
          className="size-8 animate-spin text-[#f0f0ee] motion-reduce:animate-none"
        />
      </div>
    );
  }
  if (!started) {
    return (
      <button
        aria-label="Play recording"
        className="group/start absolute inset-0 flex items-center justify-center bg-[#080808]/25 outline-none"
        onClick={() => remote.play()}
        type="button"
      >
        <span className="ease-intent flex size-16 items-center justify-center rounded-full bg-[#f0f0ee] text-[#080808] shadow-[0_8px_24px_#00000059] transition-[background-color,transform] duration-500 group-hover/start:scale-105 group-hover/start:bg-[#ddec61] group-focus-visible/start:outline-2 group-focus-visible/start:outline-offset-4 group-focus-visible/start:outline-[#ddec61]">
          <Play aria-hidden className="ml-0.5 size-6 fill-current" />
        </span>
      </button>
    );
  }
  return null;
};

export const ReportVideo = ({
  devtools,
  src,
  title,
}: {
  devtools: DevtoolsSnapshot;
  src: string | null;
  title: string;
}) => {
  const { durationMs, playerRef, seek, startedAt, syncPlayhead } =
    useReportPlayback();

  if (!src) {
    return (
      <div className="flex aspect-video flex-col items-center justify-center gap-1 rounded-2xl bg-[#080808] p-6 text-center">
        <p className="text-sm font-medium text-[#f0f0ee]">
          The video was not uploaded
        </p>
        <p className="max-w-xs text-xs text-[#cfcdcb]">
          The recording stopped before it reached Google Drive. The console and
          network logs are still here.
        </p>
      </div>
    );
  }

  const markers = timelineMarkers(devtools, startedAt);
  const jump = (atMs: number) => {
    seek(Math.max(atMs - PRE_ROLL_MS, 0));
    void playerRef.current?.play();
  };

  return (
    <MediaPlayer
      className="group/player flex flex-col overflow-hidden rounded-2xl bg-[#080808] p-1.5 text-[#f0f0ee] data-[fullscreen]:rounded-none data-[fullscreen]:p-0"
      // Known up front: older uploads lack WebM duration metadata.
      duration={durationMs / MS_PER_SECOND}
      onTimeUpdate={({ currentTime }) =>
        syncPlayhead(currentTime * MS_PER_SECOND)
      }
      playsInline
      ref={playerRef}
      // The URL has no file extension, so Vidstack needs the MIME type to pick the video provider.
      src={{ src, type: VIDEO_MIME_TYPE }}
      title={title}
    >
      {/* Controls sit below the picture, never over it: the bug is often at the bottom of the recorded page. */}
      <div className="relative aspect-video overflow-hidden rounded-xl bg-black group-data-[fullscreen]/player:aspect-auto group-data-[fullscreen]/player:flex-1 group-data-[fullscreen]/player:rounded-none">
        <MediaProvider className="size-full [&_video]:size-full [&_video]:object-contain" />
        <Gesture
          action="toggle:paused"
          className="absolute inset-0"
          event="pointerup"
        />
        <StageOverlay />
      </div>
      <ControlBar durationMs={durationMs} markers={markers} onJump={jump} />
    </MediaPlayer>
  );
};
