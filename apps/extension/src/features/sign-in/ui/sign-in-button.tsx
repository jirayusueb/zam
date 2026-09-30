import { Button } from "@zam/ui/components/button";

import { openWebPage } from "@/shared/lib/open-web-page";

export const SignInButton = () => (
  <Button
    onClick={() => {
      openWebPage("/login");
    }}
  >
    Sign in with Google
  </Button>
);
