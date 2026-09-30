import { useClipboard } from "@shined/react-use";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Button, buttonVariants } from "@zam/ui/components/button";
import { ArrowUpRightIcon } from "@zam/ui/components/icons/arrow-up-right";
import type { ArrowUpRightIconHandle } from "@zam/ui/components/icons/arrow-up-right";
import { CheckIcon } from "@zam/ui/components/icons/check";
import { LinkIcon } from "@zam/ui/components/icons/link";
import type { LinkIconHandle } from "@zam/ui/components/icons/link";
import { Skeleton } from "@zam/ui/components/skeleton";
import {
  playOnMount,
  useIconAnimation,
} from "@zam/ui/hooks/use-icon-animation";
import { toast } from "sonner";

import {
  formatOffset,
  ReportStatusBadge,
  ReportTimeline,
  ReportPlayback,
  sharedBugReportQuery,
} from "@/entities/bug-report";
import { ReportComments } from "@/widgets/report-comments";
import { ReportDevtools } from "@/widgets/report-devtools";
import { RouteFallback } from "@/widgets/route-fallback";

const PAGE = "mx-auto w-full max-w-[1520px] px-5 pt-6 pb-16 md:px-10";

// useClipboard falls back to execCommand where the Clipboard API is missing; `copied` resets after 1.5s.
const CopyLinkButton = () => {
  const { copied, copy } = useClipboard();
  const [linkRef, linkTrigger] = useIconAnimation<LinkIconHandle>();

  const copyLink = async () => {
    try {
      await copy(window.location.href);
      toast.success("Link copied");
    } catch {
      toast.error("Couldn't copy the link. Copy it from the address bar.");
    }
  };

  return (
    <Button
      className="self-start md:self-auto"
      onClick={copyLink}
      variant="outline"
      {...linkTrigger}
    >
      {copied ? (
        <CheckIcon aria-hidden ref={playOnMount} />
      ) : (
        <LinkIcon aria-hidden ref={linkRef} />
      )}
      {copied ? "Copied" : "Copy link"}
    </Button>
  );
};

const PageUrlLink = ({ href }: { href: string }) => {
  const [arrowRef, arrowTrigger] = useIconAnimation<ArrowUpRightIconHandle>();

  return (
    <a
      className="text-muted-foreground hover:text-foreground inline-flex max-w-full items-center gap-1 font-mono text-xs underline decoration-current/30 underline-offset-4"
      href={href}
      rel="noopener noreferrer"
      target="_blank"
      {...arrowTrigger}
    >
      <span className="truncate">{href}</span>
      <ArrowUpRightIcon aria-hidden ref={arrowRef} size={14} />
    </a>
  );
};

export const SharedReportPage = ({ reportId }: { reportId: string }) => {
  const { data, error, isLoading } = useQuery(sharedBugReportQuery(reportId));

  if (isLoading) {
    return (
      <main aria-busy className={`${PAGE} flex flex-col gap-6`}>
        <Skeleton className="h-10 w-2/3 max-w-xl" />
        <Skeleton className="h-2 w-full" />
        <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <Skeleton className="aspect-video rounded-2xl" />
          <Skeleton className="h-[480px] rounded-2xl" />
        </div>
      </main>
    );
  }

  if (error || !data) {
    return (
      <RouteFallback
        actions={
          <Link className={buttonVariants({ size: "lg" })} to="/">
            Go to Zam
          </Link>
        }
        description="The link may be incomplete. Ask the reporter to send the share link again."
        evidence={{
          kind: "Network",
          tag: "GET",
          text: "404 Not Found",
        }}
        evidenceTitle="Report not found"
        title="This report doesn’t exist."
      />
    );
  }

  const { devtools, recording } = data;

  return (
    <main className={`${PAGE} flex flex-col gap-6`}>
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex min-w-0 flex-col gap-3">
          <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-xs tabular-nums">
            <ReportStatusBadge status={data.status} />
            <time dateTime={data.createdAt.toISOString()}>
              {data.createdAt.toLocaleString()}
            </time>
            <span>{formatOffset(recording.durationMs)} recorded</span>
          </div>
          <h1 className="font-display text-headline md:text-title text-balance break-words">
            {data.title}
          </h1>
          {data.pageUrl ? <PageUrlLink href={data.pageUrl} /> : null}
        </div>
        <CopyLinkButton />
      </div>
      <ReportTimeline
        devtools={devtools}
        durationMs={recording.durationMs}
        startedAt={recording.startedAt}
      />
      <ReportPlayback.Provider
        durationMs={recording.durationMs}
        startedAt={recording.startedAt}
      >
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <ReportPlayback.Video
            src={
              data.status === "published"
                ? `/api/reports/${encodeURIComponent(data.reportId)}/video`
                : null
            }
            title={data.title}
          />
          <ReportDevtools devtools={devtools} />
        </div>
      </ReportPlayback.Provider>
      <div className="max-w-3xl">
        <ReportComments reportId={data.reportId} />
      </div>
    </main>
  );
};
