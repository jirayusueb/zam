import { Link } from "@tanstack/react-router";
import { buttonVariants } from "@zam/ui/components/button";
import { ArrowRightIcon } from "@zam/ui/components/icons/arrow-right";
import type { ArrowRightIconHandle } from "@zam/ui/components/icons/arrow-right";
import { useIconAnimation } from "@zam/ui/hooks/use-icon-animation";

import { authClient } from "@/shared/api/auth-client";
import { extensionDownloadPath } from "@/shared/config/extension";

import { ReportWall } from "./report-wall";

const STORED_BY_ZAM = [
  "Report title and the page URL",
  "Console logs, warnings, errors and uncaught rejections",
  "Fetch and XHR requests: method, URL, status, timing, headers and text bodies",
  "Your clicks and page navigations, never what you type",
  "Cookies and local/session storage at the moment you stop",
  "Browser, OS, screen size and connection",
  "Tokens, passwords and session cookies, replaced with [REDACTED]",
] as const;

const INSTALL_STEPS = [
  {
    detail: "One zip for Chrome, Edge, Brave and Arc.",
    title: "Download the extension",
  },
  {
    detail:
      "Turn on Developer mode in chrome://extensions, then Load unpacked.",
    title: "Load it in your browser",
  },
  {
    detail: "Sign in with Google, press Start recording, reproduce, stop.",
    title: "Record the bug",
  },
] as const;

const DownloadButton = () => (
  <a
    className={buttonVariants({ size: "lg", variant: "outline" })}
    href={extensionDownloadPath("chrome")}
  >
    Download for Chrome
  </a>
);

/** `shared`: morphs into the login button on navigation. View-transition names must be unique, so only one CTA per page sets it. */
const PrimaryAction = ({ shared = false }: { shared?: boolean }) => {
  const { data: session } = authClient.useSession();
  const [arrowRef, arrowTrigger] = useIconAnimation<ArrowRightIconHandle>();

  if (session) {
    return (
      <Link
        className={buttonVariants({ size: "lg" })}
        to="/dashboard"
        {...arrowTrigger}
      >
        Open your reports
        <ArrowRightIcon aria-hidden ref={arrowRef} />
      </Link>
    );
  }
  return (
    <Link
      className={buttonVariants({
        className: shared && "[view-transition-name:sign-in-cta]",
        size: "lg",
      })}
      to="/login"
    >
      Get started with Google
    </Link>
  );
};

export const HomePage = () => (
  <main className="flex flex-col">
    <section className="grid gap-8 px-5 pt-10 pb-12 md:px-10 md:pt-16 lg:grid-cols-12 lg:items-end lg:gap-10 lg:pb-16">
      <h1 className="font-display text-display font-[380] text-balance sm:text-[72px] lg:col-span-7 lg:text-[90px]">
        <span className="block">One link.</span>
        <span className="block">The whole bug.</span>
      </h1>
      <div className="flex flex-col gap-6 lg:col-span-5 lg:pb-3">
        <p className="text-muted-foreground max-w-[44ch] text-lg leading-relaxed">
          Record your screen once. Engineers get the video, the console, every
          network request and each click from that moment. Videos stay in your
          Google Drive.
        </p>
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-3">
            <PrimaryAction shared />
            <DownloadButton />
          </div>
          <p className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-sm">
            <span>Chrome, Edge, Brave, Arc</span>
            <Link
              className="hover:text-foreground underline decoration-current/30 underline-offset-4"
              to="/docs/install-extension"
            >
              Install guide
            </Link>
            <a
              className="hover:text-foreground underline decoration-current/30 underline-offset-4"
              href="#sample"
            >
              See a sample report
            </a>
          </p>
        </div>
      </div>
    </section>

    <ReportWall />

    <section className="grid gap-10 px-5 pt-24 pb-20 md:px-10 lg:grid-cols-12 lg:gap-10 lg:pt-36">
      <p className="font-display text-headline md:text-title text-balance lg:col-span-7">
        Press record in the Zam extension, reproduce the bug, press stop. The
        engineer opens one link: the recording, the console, the network log and
        your steps on the same clock.
      </p>
      <dl className="grid gap-8 sm:grid-cols-2 lg:col-span-5 lg:col-start-8">
        <div className="flex flex-col gap-3">
          <dt className="text-xs font-medium">In your Google Drive</dt>
          <dd className="text-muted-foreground text-sm leading-relaxed">
            The video file, shared by link from your own account. Zam never
            stores video.
          </dd>
        </div>
        <div className="flex flex-col gap-3">
          <dt className="text-xs font-medium">Kept by Zam</dt>
          {STORED_BY_ZAM.map((item) => (
            <dd
              className="text-muted-foreground border-border border-t pt-3 text-sm leading-relaxed"
              key={item}
            >
              {item}
            </dd>
          ))}
        </div>
      </dl>
    </section>
    <section
      aria-labelledby="install-title"
      className="grid gap-10 px-5 pb-24 md:px-10 lg:grid-cols-12 lg:gap-10"
      id="install"
    >
      <div className="flex flex-col items-start gap-6 lg:col-span-5">
        <h2
          className="font-display text-headline md:text-title max-w-[16ch] text-balance"
          id="install-title"
        >
          Two minutes to install.
        </h2>
        <p className="text-muted-foreground max-w-[40ch] leading-relaxed">
          Zam isn’t in the Chrome Web Store yet. Download the zip and load it
          yourself; the guide walks through every click.
        </p>
        <div className="flex flex-wrap gap-3">
          <DownloadButton />
          <Link
            className={buttonVariants({ size: "lg", variant: "ghost" })}
            to="/docs/install-extension"
          >
            Read the install guide
          </Link>
        </div>
      </div>
      <ol className="grid gap-3 sm:grid-cols-3 lg:col-span-7">
        {INSTALL_STEPS.map((step, index) => (
          <li
            className="bg-card flex flex-col gap-3 rounded-[20px] p-5"
            key={step.title}
          >
            <span className="text-muted-foreground font-mono text-xs tabular-nums">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="font-medium">{step.title}</span>
            <span className="text-muted-foreground text-sm leading-relaxed">
              {step.detail}
            </span>
          </li>
        ))}
      </ol>
    </section>

    <section className="flex flex-col items-start gap-6 px-5 pb-24 md:px-10">
      <h2 className="font-display text-headline md:text-title max-w-[16ch] text-balance">
        Stop writing repro steps.
      </h2>
      <div className="flex flex-wrap gap-3">
        <PrimaryAction />
        <DownloadButton />
      </div>
    </section>

    <footer className="border-border flex flex-col gap-6 border-t px-5 pt-8 pb-6 md:px-10">
      <div className="text-muted-foreground flex flex-wrap justify-between gap-4 text-xs">
        <span>Recordings up to 5 minutes, saved to Google Drive.</span>
        <span className="flex gap-4">
          <Link className="hover:text-foreground" to="/docs/install-extension">
            Install guide
          </Link>
          <Link className="hover:text-foreground" to="/privacy-policy">
            Privacy
          </Link>
          <Link className="hover:text-foreground" to="/dashboard">
            Dashboard
          </Link>
        </span>
      </div>
      <p
        aria-hidden
        className="font-display text-[clamp(120px,30vw,420px)] leading-[0.78] tracking-[-0.04em] select-none"
      >
        zam
      </p>
    </footer>
  </main>
);
