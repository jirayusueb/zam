import { Button } from "@zam/ui/components/button";

import { openWebPage } from "@/shared/lib/open-web-page";

export const SignInButton = () => (
  <Button
    size="lg"
    className="w-full"
    onClick={() => {
      openWebPage("/login");
    }}
  >
    Sign in with Google
  </Button>
);
