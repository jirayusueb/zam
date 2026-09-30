import { Button } from "@zam/ui/components/button";
import { GoogleIcon } from "@zam/ui/components/google-icon";

import { authClient } from "@/shared/api/auth-client";

export const GoogleSignInButton = ({
  className,
  callbackURL = "/dashboard",
}: {
  className?: string;
  /** Where to land after sign-in. */
  callbackURL?: string;
}) => (
  <Button
    className={className}
    onClick={() => {
      authClient.signIn.social({
        callbackURL,
        provider: "google",
      });
    }}
    size="lg"
  >
    <GoogleIcon data-icon="inline-start" />
    Continue with Google
  </Button>
);
