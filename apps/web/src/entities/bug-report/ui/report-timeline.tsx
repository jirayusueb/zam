import type { DevtoolsSnapshot } from "@zam/capture/domain/value-objects/devtools-snapshot";
import { cn } from "@zam/ui/lib/utils";

import { formatOffset } from "../lib/format-offset";
import { isProblemMarker, timelineMarkers } from "../lib/timeline-markers";
import type { TimelineMarker } from "../lib/timeline-markers";

const PERCENT = 100;

const MARKER_CLASS: Record<TimelineMarker["kind"], string> = {
  error: "bg-destructive",
  failed: "bg-destructive ring-destructive/30 ring-4",
  warn: "bg-chart-4",
};

/**
 * One bar per recording: console errors/warnings and failed requests pinned
 * at the moment they happened, so an engineer knows where to scrub the video.
 */
export const ReportTimeline = ({
  devtools,
  durationMs,
  startedAt,
}: {
  devtools: DevtoolsSnapshot;
  durationMs: number;
  startedAt: Date;
}) => {
  const markers = timelineMarkers(devtools, startedAt);
  const errors = markers.filter(isProblemMarker).length;
  const span = Math.max(durationMs, 1);
  return (
    <div className="flex items-center gap-3 font-mono text-xs tabular-nums">
      <span className="sr-only">
        {errors} {errors === 1 ? "error" : "errors"} across{" "}
        {formatOffset(durationMs)} of recording
      </span>
      <span aria-hidden className="text-muted-foreground">
        0:00
      </span>
      <div aria-hidden className="bg-muted relative h-1.5 flex-1 rounded-full">
        {markers.map((marker, index) => (
          <span
            className={cn(
              "absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full",
              MARKER_CLASS[marker.kind]
            )}
            key={`${marker.at}-${index}`}
            style={{
              left: `${Math.min(Math.max(marker.at / span, 0), 1) * PERCENT}%`,
            }}
            title={`${formatOffset(marker.at)} ${marker.label}`}
          />
        ))}
      </div>
      <span className="text-muted-foreground">{formatOffset(durationMs)}</span>
    </div>
  );
};
