import { Button } from "@zam/ui/components/button";
import { Skeleton } from "@zam/ui/components/skeleton";
import { Spinner } from "@zam/ui/components/spinner";

import { CaptureStatus, useCaptureSession } from "@/entities/capture-session";
import { useViewer, ViewerSummary } from "@/entities/viewer";
import { SignInButton } from "@/features/sign-in";
import { StartCaptureButton } from "@/features/start-capture";
import { StopCaptureButton } from "@/features/stop-capture";
import { openWebPage } from "@/shared/lib/open-web-page";

const Wordmark = () => (
  <span className="font-display text-[22px] leading-none tracking-[-0.03em] lowercase">
    zam
  </span>
);

const OpenDashboardButton = () => (
  <Button
    variant="ghost"
    size="sm"
    className="self-start px-0 text-sm hover:bg-transparent"
    onClick={() => {
      openWebPage("/dashboard");
    }}
  >
    Open dashboard
  </Button>
);

const CaptureControls = () => {
  const session = useCaptureSession();

  if (!session || session.status === "idle") {
    const outcome = session?.lastOutcome ?? null;
    return (
      <div className="flex flex-col gap-3">
        <StartCaptureButton />
        <p className="text-muted-foreground text-xs">
          Up to 5 minutes. Console and network logs are captured from this tab.
        </p>
        {outcome?.kind === "published" ? (
          <div className="bg-card flex items-center justify-between gap-2 rounded-2xl p-3">
            <div className="flex items-center gap-2 text-sm">
              <span className="bg-brand size-2 rounded-full" />
              Report ready
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                openWebPage(`/r/${outcome.reportId}`);
              }}
            >
              Open report
            </Button>
          </div>
        ) : null}
        {outcome?.kind === "failed" ? (
          <div className="bg-destructive/10 flex flex-col gap-2 rounded-2xl p-3">
            <p className="text-destructive text-sm">{outcome.message}</p>
            {outcome.reportId ? (
              <Button
                variant="outline"
                size="sm"
                className="self-start"
                onClick={() => {
                  openWebPage(`/r/${outcome.reportId}`);
                }}
              >
                Open report
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  }

  if (session.status === "selecting") {
    return (
      <div className="text-muted-foreground flex items-center gap-2 text-sm">
        <Spinner />
        Choose a screen, window or tab to share
      </div>
    );
  }

  if (session.status === "recording") {
    return (
      <div className="flex flex-col gap-3">
        <CaptureStatus startedAt={session.startedAt} />
        <StopCaptureButton />
      </div>
    );
  }

  return (
    <div className="text-muted-foreground flex items-center gap-2 text-sm">
      <Spinner />
      Uploading to your Google Drive
    </div>
  );
};

export const PopupPage = () => {
  const { user, isPending } = useViewer();

  if (isPending) {
    return (
      <div className="bg-background flex w-80 flex-col gap-4 p-4">
        <div className="flex items-center justify-between">
          <Wordmark />
          <Skeleton className="size-7 rounded-full" />
        </div>
        <Skeleton className="h-12 w-full rounded-2xl" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="bg-background text-foreground flex w-80 flex-col gap-4 p-4">
        <Wordmark />
        <div className="flex flex-col gap-3">
          <h1 className="font-display text-[28px] leading-tight tracking-[-0.03em]">
            Record the bug once
          </h1>
          <p className="text-muted-foreground text-sm">
            We save the video to your Google Drive, plus console and network
            logs from the tab.
          </p>
          <SignInButton />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background text-foreground flex w-80 flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <Wordmark />
        <ViewerSummary user={user} />
      </div>
      <CaptureControls />
      <OpenDashboardButton />
    </div>
  );
};
