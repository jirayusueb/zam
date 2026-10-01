import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { GOOGLE_DRIVE_FILE_SCOPE } from "@zam/auth/scopes";
import { Button } from "@zam/ui/components/button";
import { GoogleIcon } from "@zam/ui/components/google-icon";
import { Skeleton } from "@zam/ui/components/skeleton";
import { useEffect } from "react";

import { authClient } from "@/shared/api/auth-client";
import { driveAccessPath } from "@/shared/lib/drive-access-path";

/**
 * Re-grants Drive access. Signing in again is not enough: Better Auth only
 * refreshes the stored scopes when the Google account is (re)linked, so this
 * runs `linkSocial` with the Drive scope (consent prompt, fresh refresh token).
 */
export const ConnectGoogleDrive = ({ next }: { next?: string }) => {
  const navigate = useNavigate();
  // Coming back from Google lands here again, keeping `next`.
  const callbackURL = next ? driveAccessPath(next) : "/connect-drive";
  const { data: session, isPending } = authClient.useSession();
  const accounts = useQuery({
    enabled: Boolean(session),
    queryFn: async () => {
      const { data, error } = await authClient.listAccounts();
      if (error) {
        throw new Error(error.message ?? "Couldn't load your Google account");
      }
      return data;
    },
    queryKey: ["auth", "accounts", session?.user.id],
  });

  const google = accounts.data?.find(
    (account) => account.providerId === "google"
  );
  const granted = google?.scopes.includes(GOOGLE_DRIVE_FILE_SCOPE) ?? false;

  // The sign-in check: with access already allowed, continue without a stop.
  useEffect(() => {
    if (granted && next) {
      void navigate({ href: next, replace: true });
    }
  }, [granted, navigate, next]);

  if (isPending || (session && accounts.isLoading)) {
    return <Skeleton className="h-11 w-64 rounded-full" />;
  }

  if (!session) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-muted-foreground text-sm">
          Sign in first; Google then asks for Drive access.
        </p>
        <Button
          onClick={() => {
            void authClient.signIn.social({
              callbackURL,
              provider: "google",
            });
          }}
          size="lg"
        >
          <GoogleIcon data-icon="inline-start" />
          Continue with Google
        </Button>
      </div>
    );
  }

  if (granted && next) {
    return (
      <p className="text-muted-foreground text-sm">
        Google Drive access is allowed. Continuing…
      </p>
    );
  }

  if (granted) {
    return (
      <div className="bg-card flex flex-col gap-2 rounded-2xl p-5">
        <p className="flex items-center gap-2 font-medium">
          <span
            aria-hidden
            className="bg-brand ring-foreground/20 size-2.5 rounded-full ring-1"
          />
          Google Drive access is allowed
        </p>
        <p className="text-muted-foreground text-sm">
          You can close this tab. Back in the Zam editor, press{" "}
          <strong className="text-foreground font-medium">
            Publish report
          </strong>{" "}
          again.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-3">
      <Button
        onClick={() => {
          void authClient.linkSocial({
            callbackURL,
            provider: "google",
            scopes: [GOOGLE_DRIVE_FILE_SCOPE],
          });
        }}
        size="lg"
      >
        <GoogleIcon data-icon="inline-start" />
        Allow Google Drive access
      </Button>
      {google ? (
        <p className="text-muted-foreground text-sm">
          Drive access isn’t allowed for {session.user.email} yet. On Google’s
          screen, tick the box for Google Drive.
        </p>
      ) : null}
    </div>
  );
};
