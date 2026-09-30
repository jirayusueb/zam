import { Link, useRouter } from "@tanstack/react-router";
import type { ErrorComponentProps } from "@tanstack/react-router";
import { Button, buttonVariants } from "@zam/ui/components/button";
import { Copy, RotateCw } from "lucide-react";
import { toast } from "sonner";

import { RouteFallback } from "@/widgets/route-fallback";

const messageOf = (error: unknown): string =>
  error instanceof Error && error.message ? error.message : String(error);

export const ErrorPage = ({ error }: ErrorComponentProps) => {
  const router = useRouter();
  const message = messageOf(error);
  const stack = error instanceof Error ? error.stack : undefined;

  const copyDetails = async () => {
    try {
      await navigator.clipboard.writeText(
        `${message}\n${window.location.href}`
      );
      toast.success("Error details copied");
    } catch {
      toast.error("Couldn't copy. Select the error text and copy it by hand.");
    }
  };

  return (
    <RouteFallback
      actions={
        <>
          <Button onClick={() => router.invalidate()} size="lg">
            <RotateCw aria-hidden />
            Try again
          </Button>
          <Button onClick={copyDetails} size="lg" variant="outline">
            <Copy aria-hidden />
            Copy error details
          </Button>
          <Link
            className={buttonVariants({ size: "lg", variant: "ghost" })}
            to="/"
          >
            Go to Zam
          </Link>
        </>
      }
      description="Zam hit an error while showing it. Try again; if it keeps failing, copy the error details and send them to whoever runs Zam for your team."
      evidence={{ kind: "Console", tag: "ERROR", text: message }}
      evidenceTitle="Uncaught error"
      title="This page broke."
    >
      {import.meta.env.DEV && stack ? (
        <details className="w-full min-w-0">
          <summary className="text-muted-foreground hover:text-foreground cursor-pointer text-sm">
            Stack trace (development only)
          </summary>
          <pre className="bg-muted mt-3 max-h-80 overflow-auto rounded-xl p-4 font-mono text-xs leading-5">
            {stack}
          </pre>
        </details>
      ) : null}
    </RouteFallback>
  );
};
