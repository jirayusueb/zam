import { Button } from "@zam/ui/components/button";
import { GoogleIcon } from "@zam/ui/components/google-icon";

import { authClient } from "@/shared/api/auth-client";
import { driveAccessPath } from "@/shared/lib/drive-access-path";

export const GoogleSignInButton = ({
  className,
  callbackURL = "/dashboard",
}: {
  className?: string;
  /** Where to land after sign-in, once Drive access is confirmed. */
  callbackURL?: string;
}) => (
  <Button
    className={className}
    onClick={() => {
      authClient.signIn.social({
        callbackURL: driveAccessPath(callbackURL),
        provider: "google",
      });
    }}
    size="lg"
  >
    <GoogleIcon data-icon="inline-start" />
    Continue with Google
  </Button>
);
