import { Link } from "@tanstack/react-router";
import { buttonVariants } from "@zam/ui/components/button";

import { authClient } from "@/shared/api/auth-client";
import { RouteFallback } from "@/widgets/route-fallback";

export const NotFoundPage = () => {
  const { data: session } = authClient.useSession();

  return (
    <RouteFallback
      actions={
        <>
          <Link className={buttonVariants({ size: "lg" })} to="/">
            Go to Zam
          </Link>
          {session ? (
            <Link
              className={buttonVariants({ size: "lg", variant: "outline" })}
              to="/dashboard"
            >
              Open your reports
            </Link>
          ) : null}
        </>
      }
      description="The address may have a typo, or the page moved. If someone sent you this link, ask them to copy it again."
      evidence={{ kind: "Network", tag: "GET", text: "404 Not Found" }}
      evidenceTitle="Page not found"
      title="Nothing at this link."
    />
  );
};
