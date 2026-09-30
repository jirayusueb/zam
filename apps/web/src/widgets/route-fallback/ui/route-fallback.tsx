import { useLocation } from "@tanstack/react-router";
import type { ReactNode } from "react";

/** The one failed row this page files about itself: a network miss or a console error. */
export interface FallbackEvidence {
  kind: "Console" | "Network";
  tag: string;
  text: string;
}

const EvidenceCard = ({
  evidence,
  title,
}: {
  evidence: FallbackEvidence;
  title: string;
}) => {
  const { href } = useLocation();

  return (
    <article className="bg-card dark:bg-popover dark:ring-border ease-intent animate-in slide-in-from-bottom-4 flex flex-col overflow-hidden rounded-2xl shadow-[0_16px_40px_#08080824] duration-700 motion-reduce:animate-none dark:shadow-none dark:ring-1">
      <header className="flex flex-col gap-1.5 p-4 md:p-5">
        <h2 className="font-display text-2xl tracking-[-0.03em]">{title}</h2>
        <span className="text-muted-foreground truncate font-mono text-xs">
          {href}
        </span>
      </header>
      <span className="text-muted-foreground border-border border-y px-4 py-2 text-xs font-medium md:px-5">
        {evidence.kind}
      </span>
      <p className="bg-destructive/[0.06] text-destructive grid grid-cols-[3.5rem_minmax(0,1fr)] gap-2 px-4 py-2 font-mono text-xs leading-5 md:px-5">
        <span className="font-medium">{evidence.tag}</span>
        <span className="break-words">{evidence.text}</span>
      </p>
    </article>
  );
};

/**
 * Not-found and error states: a plain explanation on the left, and on the
 * right the failure written up the way Zam writes up any bug.
 */
export const RouteFallback = ({
  actions,
  children,
  description,
  evidence,
  evidenceTitle,
  title,
}: {
  actions: ReactNode;
  /** Extra material under the actions, e.g. a dev-only stack trace. */
  children?: ReactNode;
  description: string;
  evidence: FallbackEvidence;
  evidenceTitle: string;
  title: string;
}) => (
  <main className="mx-auto grid w-full max-w-[1520px] flex-1 content-center gap-10 px-5 pt-10 pb-20 md:px-10 lg:grid-cols-12 lg:items-center">
    <div className="flex min-w-0 flex-col items-start gap-6 lg:col-span-6">
      <h1 className="font-display text-display font-[380] text-balance sm:text-[64px] lg:text-[80px]">
        {title}
      </h1>
      <p className="text-muted-foreground max-w-[48ch] text-lg text-pretty">
        {description}
      </p>
      <div className="flex flex-wrap gap-3">{actions}</div>
      {children}
    </div>
    <div className="min-w-0 lg:col-span-5 lg:col-start-8">
      <EvidenceCard evidence={evidence} title={evidenceTitle} />
    </div>
  </main>
);
