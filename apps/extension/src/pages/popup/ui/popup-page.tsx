import { Alert, AlertDescription, AlertTitle } from "@zam/ui/components/alert";
import { Button } from "@zam/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@zam/ui/components/card";
import { Separator } from "@zam/ui/components/separator";
import { Skeleton } from "@zam/ui/components/skeleton";
import { Spinner } from "@zam/ui/components/spinner";

import { CaptureStatus, useCaptureSession } from "@/entities/capture-session";
import { useViewer, ViewerSummary } from "@/entities/viewer";
import { SignInButton } from "@/features/sign-in";
import { StartCaptureButton } from "@/features/start-capture";
import { StopCaptureButton } from "@/features/stop-capture";
import { sendExtensionMessage } from "@/shared/api/messages";
import { openWebPage } from "@/shared/lib/open-web-page";

const CaptureControls = () => {
  const session = useCaptureSession();

  if (!session || session.status === "idle") {
    const outcome = session?.lastOutcome ?? null;
    return (
      <div className="flex flex-col gap-2">
        <StartCaptureButton />
        {outcome?.kind === "published" ? (
          <Alert>
            <AlertTitle>Report ready</AlertTitle>
            <Button
              variant="outline"
              onClick={() => {
                openWebPage(`/r/${outcome.reportId}`);
              }}
            >
              Open report
            </Button>
          </Alert>
        ) : null}
        {outcome?.kind === "failed" ? (
          <Alert variant="destructive">
            <AlertTitle>Recording failed</AlertTitle>
            <AlertDescription>{outcome.message}</AlertDescription>
            {outcome.reportId ? (
              <Button
                variant="outline"
                onClick={() => {
                  openWebPage(`/r/${outcome.reportId}`);
                }}
              >
                Open report
              </Button>
            ) : null}
          </Alert>
        ) : null}
      </div>
    );
  }

  if (session.status === "selecting") {
    return (
      <div className="text-muted-foreground flex items-center gap-2 text-sm">
        <Spinner />
        Choose a screen, window, or tab to share…
      </div>
    );
  }

  if (session.status === "recording") {
    return (
      <div className="flex items-center justify-between gap-2">
        <CaptureStatus startedAt={session.startedAt} />
        <StopCaptureButton />
      </div>
    );
  }

  if (session.status === "editing") {
    const { editorTabId } = session;
    return (
      <div className="flex flex-col gap-2">
        <p className="text-muted-foreground text-sm">
          Cut your recording in the editor tab, then publish it.
        </p>
        <div className="flex gap-2">
          <Button
            className="flex-1"
            disabled={editorTabId === null}
            onClick={() => {
              if (editorTabId !== null) {
                void browser.tabs.update(editorTabId, { active: true });
              }
            }}
          >
            Show editor
          </Button>
          <Button
            onClick={() => {
              void sendExtensionMessage({ type: "capture:discard" });
            }}
            variant="ghost"
          >
            Discard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="text-muted-foreground flex items-center gap-2 text-sm">
      <Spinner />
      Uploading to Google Drive…
    </div>
  );
};

export const PopupPage = () => {
  const { user, isPending } = useViewer();

  if (isPending) {
    return (
      <div className="w-80 p-4">
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="w-80 p-4">
        <Card>
          <CardHeader>
            <CardTitle>Zam</CardTitle>
            <CardDescription>
              Record your screen with console and network logs. Videos are saved
              to your Google Drive.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SignInButton />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex w-80 flex-col gap-3 p-4">
      <ViewerSummary user={user} />
      <Separator />
      <CaptureControls />
      <Separator />
      <Button
        variant="link"
        onClick={() => {
          openWebPage("/dashboard");
        }}
      >
        Open dashboard
      </Button>
    </div>
  );
};
