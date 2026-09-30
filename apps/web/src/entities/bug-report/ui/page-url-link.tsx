import { ArrowUpRightIcon } from "@zam/ui/components/icons/arrow-up-right";
import type { ArrowUpRightIconHandle } from "@zam/ui/components/icons/arrow-up-right";
import { useIconAnimation } from "@zam/ui/hooks/use-icon-animation";

/** The page URL a report was captured from, linked out with an animated external-link glyph. */
export const PageUrlLink = ({ href }: { href: string }) => {
  const [arrowRef, arrowTrigger] = useIconAnimation<ArrowUpRightIconHandle>();

  return (
    <a
      className="text-muted-foreground hover:text-foreground inline-flex max-w-full items-center gap-1 font-mono text-xs underline decoration-current/30 underline-offset-4"
      href={href}
      rel="noopener noreferrer"
      target="_blank"
      {...arrowTrigger}
    >
      <span className="truncate">{href}</span>
      <ArrowUpRightIcon aria-hidden ref={arrowRef} size={14} />
    </a>
  );
};
