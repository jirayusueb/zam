import { Link } from "@tanstack/react-router";

import { GoogleSignInButton } from "@/features/sign-in-with-google";

/** `redirect` must already be a validated same-origin path (the route's search schema does this). */
export const LoginPage = ({ redirect }: { redirect?: string }) => (
  <main className="flex flex-1 items-center justify-center px-5 pb-16">
    <div className="bg-card dark:ring-border flex w-full max-w-md flex-col gap-6 rounded-2xl p-8 shadow-[0_10px_20px_#4747410a] md:p-10 dark:shadow-none dark:ring-1">
      <div className="flex flex-col gap-3">
        <h1 className="font-display text-title">Sign in to Zam</h1>
        <p className="text-muted-foreground">
          Zam saves each recording to your own Google Drive, so Google will ask
          for Drive access. Zam keeps only the title, page URL, console and
          network log.
        </p>
      </div>
      {/* Pairs with the home hero CTA: the button you clicked becomes this one. */}
      <GoogleSignInButton
        callbackURL={redirect}
        className="[view-transition-name:sign-in-cta]"
      />
      <p className="text-muted-foreground text-xs">
        How Zam uses your Google account and data is in the{" "}
        <Link
          className="decoration-foreground/30 hover:text-foreground underline underline-offset-4"
          to="/privacy-policy"
        >
          privacy policy
        </Link>
        .
      </p>
    </div>
  </main>
);
