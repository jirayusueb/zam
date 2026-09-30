import { cn } from "@zam/ui/lib/utils";
import {
  AnimatePresence,
  animate,
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "motion/react";
import { useEffect, useRef, useState } from "react";

import {
  formatOffset,
  isFailedRequest,
  ReportTimeline,
} from "@/entities/bug-report";

import { SAMPLE_REPORTS } from "../model/sample-reports";
import type { SampleReport } from "../model/sample-reports";

const COLUMN_DURATIONS = ["70s", "88s", "62s", "96s"] as const;
const PREVIEW_ROWS = 3;
/** The focal moment: the sample recording "plays" up to the bug, then the matching log rows light up. */
const SCRUB_SECONDS = 0.8;
const EASE_OUT = [0.16, 1, 0.3, 1] as const;
const FLASH_SECONDS = 0.9;

/** Offset (ms) of the first error or failed request, or the recording's end. */
const bugOffset = (report: SampleReport): number =>
  Math.min(
    ...report.devtools.console
      .filter((entry) => entry.level === "error")
      .map((entry) => entry.timestamp),
    ...report.devtools.network
      .filter(isFailedRequest)
      .map((request) => request.timestamp),
    report.startedAt.getTime() + report.durationMs
  ) - report.startedAt.getTime();

/** Compact, static log rows for the sample panel (the report page has the full, seekable lists). */
const LogRows = ({
  bugAt,
  play,
  rows,
  startedAt,
}: {
  bugAt: number;
  play: boolean;
  rows: { at: number; tag: string; text: string; failed: boolean }[];
  startedAt: Date;
}) => (
  <ol className="divide-border divide-y font-mono text-xs leading-5">
    {rows.slice(0, PREVIEW_ROWS).map((row, index) => {
      const offset = row.at - startedAt.getTime();
      return (
        <li
          className={cn(
            "relative grid grid-cols-[2.5rem_3rem_minmax(0,1fr)] gap-2 px-4 py-1.5",
            row.failed && "bg-destructive/[0.06] text-destructive"
          )}
          key={`${row.at}-${index}`}
        >
          {row.failed ? (
            // Lights up when the scrubbing playhead reaches this row's timestamp.
            <motion.span
              animate={play ? { opacity: [0, 0.9, 0] } : undefined}
              aria-hidden
              className="bg-brand pointer-events-none absolute inset-0"
              initial={{ opacity: 0 }}
              transition={{
                delay: Math.min(offset / Math.max(bugAt, 1), 1) * SCRUB_SECONDS,
                duration: FLASH_SECONDS,
                ease: "easeOut",
              }}
            />
          ) : null}
          <span className="text-muted-foreground relative tabular-nums">
            {formatOffset(offset)}
          </span>
          <span className="relative font-medium">{row.tag}</span>
          <span className="relative truncate" title={row.text}>
            {row.text}
          </span>
        </li>
      );
    })}
  </ol>
);

const WallCard = ({
  instance,
  report,
  selected,
  onSelect,
  inert,
}: {
  instance: string;
  report: SampleReport;
  selected: boolean;
  onSelect: (selection: { instance: string; reportId: string }) => void;
  inert: boolean;
}) => {
  const errors = report.devtools.console.filter(
    (entry) => entry.level === "error"
  ).length;
  const failure = report.devtools.network.find(isFailedRequest);
  const url = new URL(report.pageUrl);
  const select = () => onSelect({ instance, reportId: report.id });

  return (
    <button
      aria-hidden={inert || undefined}
      aria-pressed={selected}
      className={cn(
        "bg-card ease-intent focus-visible:outline-foreground flex w-full flex-col items-start gap-2 rounded-2xl p-4 text-left shadow-[0_10px_20px_#4747410a] transition-[background-color,box-shadow] duration-500 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 dark:shadow-none",
        "hover:bg-brand hover:text-brand-foreground focus-visible:bg-brand focus-visible:text-brand-foreground",
        selected && "bg-brand text-brand-foreground"
      )}
      onClick={select}
      onFocus={select}
      onPointerEnter={select}
      tabIndex={inert ? -1 : undefined}
      type="button"
    >
      <span className="text-sm leading-snug font-medium">{report.title}</span>
      <span className="truncate font-mono text-[11px] opacity-70">
        {url.host}
        {url.pathname}
      </span>
      <span className="flex flex-wrap gap-1.5 font-mono text-[11px] tabular-nums">
        {errors > 0 ? (
          <span className="bg-destructive/10 text-destructive rounded-full px-2 py-0.5">
            {errors} {errors === 1 ? "error" : "errors"}
          </span>
        ) : null}
        {failure ? (
          <span className="bg-foreground/5 rounded-full px-2 py-0.5">
            {failure.method} {failure.status === 0 ? "fail" : failure.status}
          </span>
        ) : null}
        <span className="bg-foreground/5 rounded-full px-2 py-0.5">
          {formatOffset(report.durationMs)}
        </span>
      </span>
    </button>
  );
};

/** The recorded page at the moment of the bug, drawn as a still frame. */
const ScreenFrame = ({
  bugAt,
  play,
  report,
}: {
  bugAt: number;
  play: boolean;
  report: SampleReport;
}) => {
  const reduceMotion = useReducedMotion();
  const target = bugAt / report.durationMs;
  // Starts at the bug moment so the server render and no-JS state are complete.
  const progress = useMotionValue(target);
  const clock = useTransform(progress, (value) =>
    formatOffset(value * report.durationMs)
  );

  useEffect(() => {
    if (!play || reduceMotion) {
      progress.set(target);
      return;
    }
    const controls = animate(progress, [0, target], {
      duration: SCRUB_SECONDS,
      ease: EASE_OUT,
    });
    return () => controls.stop();
  }, [play, progress, reduceMotion, target]);

  return (
    <div className="flex aspect-video flex-col overflow-hidden rounded-xl bg-[#080808] p-1.5">
      <div className="relative flex flex-1 flex-col gap-3 rounded-lg bg-white p-4 text-[#080808]">
        <span className="font-mono text-[10px] text-[#757575]">
          {report.pageUrl}
        </span>
        <span className="text-lg font-semibold tracking-[-0.02em]">
          {report.screen.heading}
        </span>
        <span className="w-fit rounded-lg bg-[#080808] px-3 py-1.5 text-xs font-medium text-white">
          {report.screen.action}
        </span>
        <motion.span
          animate={play && !reduceMotion ? { scale: [1, 1.08, 1] } : undefined}
          className="absolute right-3 bottom-3 origin-bottom-right rounded-lg bg-[#fde8e6] px-3 py-1.5 text-[11px] font-medium text-[#b42318]"
          transition={{ delay: SCRUB_SECONDS, duration: 0.35, ease: "easeOut" }}
        >
          {report.screen.toast}
        </motion.span>
      </div>
      <div className="flex items-center gap-2 px-1 pt-1.5 font-mono text-[10px] text-[#cfcdcb] tabular-nums">
        <motion.span>{clock}</motion.span>
        <span className="relative h-1 flex-1 overflow-hidden rounded-full bg-white/15">
          <motion.span
            className="absolute inset-0 origin-left rounded-full bg-white"
            style={{ scaleX: progress }}
          />
        </span>
        <span>{formatOffset(report.durationMs)}</span>
      </div>
    </div>
  );
};

const FeaturedReport = ({
  play,
  report,
}: {
  play: boolean;
  report: SampleReport;
}) => {
  const reduceMotion = useReducedMotion();
  const bugAt = bugOffset(report);

  return (
    <article
      className="bg-card dark:ring-border dark:bg-popover flex flex-col gap-4 rounded-2xl p-4 shadow-[0_16px_40px_#08080824] md:p-5 dark:shadow-none dark:ring-1"
      id="sample"
    >
      <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <AnimatePresence initial={false} mode="popLayout">
          <motion.h3
            animate={{ filter: "blur(0px)", opacity: 1, y: 0 }}
            className="font-display text-2xl tracking-[-0.03em]"
            exit={{ opacity: 0, transition: { duration: 0.12 } }}
            initial={
              reduceMotion
                ? { opacity: 0 }
                : { filter: "blur(4px)", opacity: 0, y: 6 }
            }
            key={report.id}
            transition={{ duration: 0.3, ease: EASE_OUT }}
          >
            {report.title}
          </motion.h3>
        </AnimatePresence>
        <span className="text-muted-foreground text-xs">Sample report</span>
      </header>
      <ReportTimeline
        devtools={report.devtools}
        durationMs={report.durationMs}
        startedAt={report.startedAt}
      />
      {/* Keyed so each newly picked report replays its scrub. */}
      <div
        className="grid gap-4 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]"
        key={report.id}
      >
        <ScreenFrame bugAt={bugAt} play={play} report={report} />
        <div className="border-border flex min-w-0 flex-col overflow-hidden rounded-xl border">
          <span className="text-muted-foreground border-border border-b px-4 py-2 text-xs font-medium">
            Console
          </span>
          <LogRows
            bugAt={bugAt}
            play={play}
            rows={report.devtools.console.map((entry) => ({
              at: entry.timestamp,
              failed: entry.level === "error",
              tag: entry.level.toUpperCase(),
              text: entry.message,
            }))}
            startedAt={report.startedAt}
          />
          <span className="text-muted-foreground border-border border-y px-4 py-2 text-xs font-medium">
            Network
          </span>
          <LogRows
            bugAt={bugAt}
            play={play}
            rows={report.devtools.network.map((request) => ({
              at: request.timestamp,
              failed: isFailedRequest(request),
              tag: request.method,
              text: `${request.status === 0 ? "fail" : request.status} ${request.url}`,
            }))}
            startedAt={report.startedAt}
          />
        </div>
      </div>
    </article>
  );
};

export const ReportWall = () => {
  const wallRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const wallInView = useInView(wallRef);
  // The first scrub waits until the panel is actually seen; later picks replay it immediately.
  const panelInView = useInView(panelRef, { amount: 0.5, once: true });
  // Selection is per card instance: the same report repeats across columns.
  const [selection, setSelection] = useState({
    instance: `0-false-${SAMPLE_REPORTS[0].id}`,
    reportId: SAMPLE_REPORTS[0].id,
  });
  const selected =
    SAMPLE_REPORTS.find((report) => report.id === selection.reportId) ??
    SAMPLE_REPORTS[0];
  // Each column starts at a different report so neighbours never line up.
  const columns = COLUMN_DURATIONS.map((duration, column) => ({
    duration,
    reports: [
      ...SAMPLE_REPORTS.slice(column * 2),
      ...SAMPLE_REPORTS.slice(0, column * 2),
    ],
  }));

  return (
    <section
      aria-label="Sample bug reports"
      className="relative flex flex-col gap-6 lg:block"
    >
      <p className="text-muted-foreground px-5 text-xs md:px-10 lg:mb-4">
        Sample data. Pick a report to open it.
      </p>
      <div
        className={cn(
          "group/wall grid h-[420px] grid-cols-2 gap-3 overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,black_12%,black_88%,transparent)] px-5 md:grid-cols-3 md:px-10 lg:h-[720px] lg:grid-cols-4",
          // The drift is decorative: stop it whenever the wall is off screen.
          !wallInView && "*:[animation-play-state:paused]"
        )}
        ref={wallRef}
      >
        {columns.map((column, columnIndex) => (
          <div
            className={cn(
              "animate-wall flex flex-col *:mb-3 group-focus-within/wall:[animation-play-state:paused] group-hover/wall:[animation-play-state:paused] motion-reduce:animate-none",
              columnIndex % 2 === 1 && "[animation-direction:reverse]",
              columnIndex === 2 && "hidden md:flex",
              columnIndex === 3 && "hidden lg:flex"
            )}
            key={column.duration}
            style={
              { "--wall-duration": column.duration } as React.CSSProperties
            }
          >
            {[false, true].map((copy) =>
              column.reports.map((report) => {
                const instance = `${columnIndex}-${copy}-${report.id}`;
                return (
                  <WallCard
                    // Only the first copy of column 0 is tabbable: it holds every report and is never hidden by the panel.
                    inert={copy || columnIndex > 0}
                    instance={instance}
                    key={instance}
                    onSelect={setSelection}
                    report={report}
                    selected={instance === selection.instance}
                  />
                );
              })
            )}
          </div>
        ))}
      </div>
      <div
        className="px-5 md:px-10 lg:absolute lg:inset-x-0 lg:top-1/2 lg:mx-auto lg:max-w-[880px] lg:-translate-y-1/2 lg:px-0"
        ref={panelRef}
      >
        <FeaturedReport play={panelInView} report={selected} />
      </div>
    </section>
  );
};
