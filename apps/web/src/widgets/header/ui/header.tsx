import { Link } from "@tanstack/react-router";

import { authClient } from "@/shared/api/auth-client";

import { UserMenu } from "./user-menu";

export const Header = () => {
  // Dashboard is behind auth; hide it (including while the session loads) instead of linking to a redirect.
  const { data: session } = authClient.useSession();

  return (
    <header className="flex h-16 items-center justify-between gap-6 px-5 md:px-10">
      <Link
        aria-label="Zam home"
        className="font-display flex items-baseline text-[28px] leading-none tracking-[-0.04em] outline-offset-4"
        to="/"
      >
        zam
        {/* The logo's citrus full stop: same 0.15em dot as public/brand/zam-logo.svg. */}
        <span
          aria-hidden
          className="bg-brand ring-foreground/20 ml-[0.07em] size-[0.15em] rounded-full ring-1"
        />
      </Link>
      <nav aria-label="Main" className="flex items-center gap-1">
        <Link
          activeProps={{ className: "text-foreground" }}
          className="text-muted-foreground hover:text-foreground ease-intent rounded-lg px-3 py-2 text-sm transition-colors duration-500"
          to="/docs/install-extension"
        >
          Get the extension
        </Link>
        {session ? (
          <Link
            activeProps={{ className: "text-foreground" }}
            className="text-muted-foreground hover:text-foreground ease-intent rounded-lg px-3 py-2 text-sm transition-colors duration-500"
            to="/dashboard"
          >
            Dashboard
          </Link>
        ) : null}
        <UserMenu />
      </nav>
    </header>
  );
};
