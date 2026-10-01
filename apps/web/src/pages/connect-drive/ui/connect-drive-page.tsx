import { Link } from "@tanstack/react-router";

import { ConnectGoogleDrive } from "@/features/connect-google-drive";

export const ConnectDrivePage = ({ next }: { next?: string }) => (
  <main className="mx-auto flex w-full max-w-[68ch] flex-col gap-8 px-5 pt-10 pb-24 md:px-10 md:pt-16">
    <header className="flex flex-col gap-4">
      <h1 className="font-display text-display font-[380] text-balance sm:text-[72px]">
        Allow Google Drive access
      </h1>
      <p className="text-muted-foreground text-lg leading-relaxed">
        Zam uploads each recording to your own Google Drive, so it needs Drive
        access before you can publish. It asks only for files it creates (
        <code className="font-mono text-[0.85em]">drive.file</code>): it can’t
        see anything else in your Drive.
      </p>
    </header>
    <ConnectGoogleDrive next={next} />
    <p className="text-muted-foreground text-sm">
      Why this is needed is explained in the{" "}
      <Link className="underline underline-offset-4" to="/privacy-policy">
        privacy policy
      </Link>
      .
    </p>
  </main>
);
