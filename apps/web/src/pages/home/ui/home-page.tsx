import { Link } from "@tanstack/react-router";
import { buttonVariants } from "@zam/ui/components/button";
import { ArrowRight } from "lucide-react";

import { authClient } from "@/shared/api/auth-client";

import { ReportWall } from "./report-wall";

const STORED_BY_ZAM = [
  "Report title and the page URL",
  "Console logs, warnings, errors and uncaught rejections",
  "Fetch and XHR requests: method, URL, status, duration",
  "Secret-looking query parameters, replaced with [REDACTED]",
] as const;

const PrimaryAction = () => {
  const { data: session } = authClient.useSession();

  return session ? (
    <Link className={buttonVariants({ size: "lg" })} to="/dashboard">
      Open your reports
      <ArrowRight aria-hidden />
    </Link>
  ) : (
    <Link className={buttonVariants({ size: "lg" })} to="/login">
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
          Record your screen once. Engineers get the video, the console and
          every network request from that moment. Videos stay in your Google
          Drive.
        </p>
        <div className="flex flex-wrap gap-3">
          <PrimaryAction />
          <a
            className={buttonVariants({ size: "lg", variant: "outline" })}
            href="#sample"
          >
            See a sample report
          </a>
        </div>
      </div>
    </section>

    <ReportWall />

    <section className="grid gap-10 px-5 pt-24 pb-20 md:px-10 lg:grid-cols-12 lg:gap-10 lg:pt-36">
      <p className="font-display text-headline md:text-title text-balance lg:col-span-7">
        Press record in the Zam extension, reproduce the bug, press stop. The
        engineer opens one link: the recording, the console and the network log
        on the same clock.
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

    <section className="flex flex-col items-start gap-6 px-5 pb-24 md:px-10">
      <h2 className="font-display text-headline md:text-title max-w-[16ch] text-balance">
        Stop writing repro steps.
      </h2>
      <PrimaryAction />
    </section>

    <footer className="border-border flex flex-col gap-6 border-t px-5 pt-8 pb-6 md:px-10">
      <div className="text-muted-foreground flex flex-wrap justify-between gap-4 text-xs">
        <span>Recordings up to 5 minutes, saved to Google Drive.</span>
        <Link className="hover:text-foreground" to="/dashboard">
          Dashboard
        </Link>
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
