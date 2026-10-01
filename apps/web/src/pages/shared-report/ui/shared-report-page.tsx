import { useClipboard } from "@shined/react-use";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Button, buttonVariants } from "@zam/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@zam/ui/components/card";
import { CheckIcon } from "@zam/ui/components/icons/check";
import { LinkIcon } from "@zam/ui/components/icons/link";
import type { LinkIconHandle } from "@zam/ui/components/icons/link";
import { Skeleton } from "@zam/ui/components/skeleton";
import {
  playOnMount,
  useIconAnimation,
} from "@zam/ui/hooks/use-icon-animation";
import { Download } from "lucide-react";
import { toast } from "sonner";

import {
  formatOffset,
  PageUrlLink,
  ReportPlayback,
  ReportStatusBadge,
  sharedBugReportQuery,
} from "@/entities/bug-report";
import { DeleteReportDialog } from "@/features/delete-report";
import { EditReportDetails, EditReportSummary } from "@/features/edit-report";
import { ReportComments } from "@/widgets/report-comments";
import { ReportDevtools } from "@/widgets/report-devtools";
import { RouteFallback } from "@/widgets/route-fallback";

import { downloadReportJson } from "../lib/download-report-json";

const PAGE = "mx-auto w-full max-w-[1520px] px-5 pt-6 pb-16 md:px-10";
const GRID = "grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_380px]";

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
    <Button onClick={copyLink} size="sm" variant="outline" {...linkTrigger}>
      {copied ? (
        <CheckIcon aria-hidden ref={playOnMount} />
      ) : (
        <LinkIcon aria-hidden ref={linkRef} />
      )}
      {copied ? "Copied" : "Copy link"}
    </Button>
  );
};

const DownloadReportButton = ({
  data,
  reportId,
}: {
  data: unknown;
  reportId: string;
}) => (
  <Button
    onClick={() => downloadReportJson(data, `zam-report-${reportId}.json`)}
    size="sm"
    variant="outline"
  >
    <Download aria-hidden />
    Download
  </Button>
);

export const SharedReportPage = ({ reportId }: { reportId: string }) => {
  const { data, error, isLoading } = useQuery(sharedBugReportQuery(reportId));

  if (isLoading) {
    return (
      <main aria-busy className={`${PAGE} flex flex-col gap-6`}>
        <div className={GRID}>
          <div className="flex min-w-0 flex-col gap-4">
            <Skeleton className="aspect-video rounded-2xl" />
            <Skeleton className="h-[520px] rounded-2xl" />
          </div>
          <div className="flex min-w-0 flex-col gap-4">
            <Skeleton className="h-56 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
          </div>
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

  const { devtools, environment, recording, steps, storage } = data;

  return (
    <main className={`${PAGE} flex flex-col gap-6`}>
      <ReportPlayback.Provider
        durationMs={recording.durationMs}
        startedAt={recording.startedAt}
      >
        <div className={GRID}>
          <div className="flex min-w-0 flex-col gap-4">
            <ReportPlayback.Video
              devtools={devtools}
              src={
                data.status === "published"
                  ? `/api/reports/${encodeURIComponent(data.reportId)}/video`
                  : null
              }
              title={data.title}
            />
            <div className="h-[560px] overflow-hidden rounded-2xl border">
              <ReportDevtools
                canEdit={data.canEdit}
                devtools={devtools}
                environment={environment}
                metadata={data.metadata}
                pageUrl={data.pageUrl}
                recording={recording}
                reportId={data.reportId}
                steps={steps}
                storage={storage}
              />
            </div>
          </div>
          <div className="flex min-w-0 flex-col gap-4">
            <Card>
              <CardContent className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <EditReportSummary
                      canEdit={data.canEdit}
                      description={data.description}
                      reportId={data.reportId}
                      title={data.title}
                    />
                  </div>
                  <ReportStatusBadge status={data.status} />
                </div>
                {data.pageUrl ? <PageUrlLink href={data.pageUrl} /> : null}
                <dl className="text-muted-foreground grid grid-cols-[5rem_1fr] gap-y-1.5 text-xs">
                  <dt>Created</dt>
                  <dd className="text-foreground">
                    {data.createdAt.toLocaleString()}
                  </dd>
                  <dt>Duration</dt>
                  <dd className="text-foreground">
                    {formatOffset(recording.durationMs)}
                  </dd>
                </dl>
                <div className="flex flex-wrap gap-2">
                  <CopyLinkButton />
                  <DownloadReportButton data={data} reportId={data.reportId} />
                  {data.canEdit ? (
                    <DeleteReportDialog reportId={data.reportId} />
                  ) : null}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Details</CardTitle>
              </CardHeader>
              <CardContent>
                <EditReportDetails
                  canEdit={data.canEdit}
                  reportId={data.reportId}
                  triage={data.triage}
                />
              </CardContent>
            </Card>
            <ReportComments reportId={data.reportId} />
          </div>
        </div>
      </ReportPlayback.Provider>
    </main>
  );
};
