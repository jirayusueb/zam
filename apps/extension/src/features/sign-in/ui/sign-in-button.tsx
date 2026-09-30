import { Button } from "@zam/ui/components/button";
import { GoogleIcon } from "@zam/ui/components/google-icon";

import { openWebPage } from "@/shared/lib/open-web-page";

export const SignInButton = () => (
  <Button
    onClick={() => {
      openWebPage("/login");
    }}
  >
    <GoogleIcon data-icon="inline-start" />
    Sign in with Google
  </Button>
);
