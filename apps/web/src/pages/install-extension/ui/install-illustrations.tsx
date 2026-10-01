import { Download, FolderOpen, Pin, Puzzle, Video } from "lucide-react";
import type { ReactNode } from "react";

/*
 * Drawn mockups of the browser and extension UI the steps refer to. Labels
 * mirror Chrome's extensions page and apps/extension (popup, wxt.config.ts);
 * update them together with the steps in install-extension-page.tsx.
 */

const OVERVIEW = [
  {
    detail: "Get the zip and unzip it.",
    href: "#chrome",
    icon: Download,
    title: "Download",
  },
  {
    detail: "Developer mode, then Load unpacked.",
    href: "#chrome",
    icon: FolderOpen,
    title: "Load unpacked",
  },
  {
    detail: "Keep it in the toolbar, sign in with Google.",
    href: "#sign-in",
    icon: Pin,
    title: "Pin and sign in",
  },
  {
    detail: "Record the bug, publish, send the link.",
    href: "#first-report",
    icon: Video,
    title: "Record",
  },
] as const;

/** Step numbering shared by the steps lists and the markers that point at them. */
export const stepLabel = (step: number) => String(step).padStart(2, "0");

/* Monochrome brand marks from Simple Icons (CC0), drawn in currentColor. */
export const ChromeIcon = ({ className }: { className?: string }) => (
  <svg
    aria-hidden
    className={className}
    fill="currentColor"
    viewBox="0 0 24 24"
  >
    <path d="M12 0C8.21 0 4.831 1.757 2.632 4.501l3.953 6.848A5.454 5.454 0 0 1 12 6.545h10.691A12 12 0 0 0 12 0zM1.931 5.47A11.943 11.943 0 0 0 0 12c0 6.012 4.42 10.991 10.189 11.864l3.953-6.847a5.45 5.45 0 0 1-6.865-2.29zm13.342 2.166a5.446 5.446 0 0 1 1.45 7.09l.002.001h-.002l-5.344 9.257c.206.01.413.016.621.016 6.627 0 12-5.373 12-12 0-1.54-.29-3.011-.818-4.364zM12 16.364a4.364 4.364 0 1 1 0-8.728 4.364 4.364 0 0 1 0 8.728Z" />
  </svg>
);

export const FirefoxIcon = ({ className }: { className?: string }) => (
  <svg
    aria-hidden
    className={className}
    fill="currentColor"
    viewBox="0 0 24 24"
  >
    <path d="M8.824 7.287c.008 0 .004 0 0 0zm-2.8-1.4c.006 0 .003 0 0 0zm16.754 2.161c-.505-1.215-1.53-2.528-2.333-2.943.654 1.283 1.033 2.57 1.177 3.53l.002.02c-1.314-3.278-3.544-4.6-5.366-7.477-.091-.147-.184-.292-.273-.446a3.545 3.545 0 01-.13-.24 2.118 2.118 0 01-.172-.46.03.03 0 00-.027-.03.038.038 0 00-.021 0l-.006.001a.037.037 0 00-.01.005L15.624 0c-2.585 1.515-3.657 4.168-3.932 5.856a6.197 6.197 0 00-2.305.587.297.297 0 00-.147.37c.057.162.24.24.396.17a5.622 5.622 0 012.008-.523l.067-.005a5.847 5.847 0 011.957.222l.095.03a5.816 5.816 0 01.616.228c.08.036.16.073.238.112l.107.055a5.835 5.835 0 01.368.211 5.953 5.953 0 012.034 2.104c-.62-.437-1.733-.868-2.803-.681 4.183 2.09 3.06 9.292-2.737 9.02a5.164 5.164 0 01-1.513-.292 4.42 4.42 0 01-.538-.232c-1.42-.735-2.593-2.121-2.74-3.806 0 0 .537-2 3.845-2 .357 0 1.38-.998 1.398-1.287-.005-.095-2.029-.9-2.817-1.677-.422-.416-.622-.616-.8-.767a3.47 3.47 0 00-.301-.227 5.388 5.388 0 01-.032-2.842c-1.195.544-2.124 1.403-2.8 2.163h-.006c-.46-.584-.428-2.51-.402-2.913-.006-.025-.343.176-.389.206-.406.29-.787.616-1.136.974-.397.403-.76.839-1.085 1.303a9.816 9.816 0 00-1.562 3.52c-.003.013-.11.487-.19 1.073-.013.09-.026.181-.037.272a7.8 7.8 0 00-.069.667l-.002.034-.023.387-.001.06C.386 18.795 5.593 24 12.016 24c5.752 0 10.527-4.176 11.463-9.661.02-.149.035-.298.052-.448.232-1.994-.025-4.09-.753-5.844z" />
  </svg>
);

/** The four stages of the guide as one connected strip; each stage jumps to its section. */
export const InstallOverview = () => (
  <nav aria-label="Install in four stages">
    <ol className="relative grid gap-6 sm:grid-cols-4 sm:gap-4">
      <span
        aria-hidden
        className="bg-border absolute top-5 right-[12.5%] left-[12.5%] hidden h-px sm:block"
      />
      {OVERVIEW.map((stage, index) => {
        const Icon = stage.icon;
        const isLast = index === OVERVIEW.length - 1;
        return (
          <li className="relative" key={stage.title}>
            <a
              className="group ease-intent flex gap-4 rounded-xl transition-colors duration-500 sm:flex-col sm:items-center sm:gap-3 sm:text-center"
              href={stage.href}
            >
              <span
                className={`ease-intent grid size-10 shrink-0 place-items-center rounded-full border transition-colors duration-500 ${
                  isLast
                    ? "bg-brand text-brand-foreground border-transparent"
                    : "bg-background border-border group-hover:bg-card"
                }`}
              >
                <Icon aria-hidden className="size-4" />
              </span>
              <span className="flex flex-col gap-1">
                <span className="text-sm font-medium">
                  <span className="text-muted-foreground mr-2 font-mono text-xs tabular-nums">
                    {stepLabel(index + 1)}
                  </span>
                  {stage.title}
                </span>
                <span className="text-muted-foreground text-sm leading-snug">
                  {stage.detail}
                </span>
              </span>
            </a>
          </li>
        );
      })}
    </ol>
  </nav>
);

/** Ties a highlighted control in a mockup to the numbered step that mentions it. */
const StepMarker = ({ step }: { step: number }) => (
  <span className="bg-foreground text-background rounded-full px-1.5 py-0.5 font-mono text-[10px] leading-none tabular-nums">
    {stepLabel(step)}
  </span>
);

const Toggle = () => (
  <span className="bg-brand relative inline-block h-4 w-7 rounded-full">
    <span className="bg-foreground absolute top-0.5 right-0.5 size-3 rounded-full" />
  </span>
);

const Figure = ({
  caption,
  children,
  label,
}: {
  caption: ReactNode;
  children: ReactNode;
  label: string;
}) => (
  <figure className="flex flex-col gap-3">
    <div aria-hidden className="select-none">
      {children}
    </div>
    <figcaption className="text-muted-foreground text-sm">
      <span className="sr-only">{label} </span>
      {caption}
    </figcaption>
  </figure>
);

const BrowserFrame = ({
  children,
  toolbar,
  url,
}: {
  children: ReactNode;
  toolbar?: ReactNode;
  url: string;
}) => (
  <div className="bg-card border-border overflow-hidden rounded-2xl border shadow-[0_12px_32px_-16px_rgb(8_8_8/0.25)]">
    <div className="border-border bg-background flex items-center gap-3 border-b px-4 py-2.5">
      <span className="flex gap-1.5">
        <span className="bg-muted size-2.5 rounded-full" />
        <span className="bg-muted size-2.5 rounded-full" />
        <span className="bg-muted size-2.5 rounded-full" />
      </span>
      <span className="bg-card text-muted-foreground min-w-0 flex-1 truncate rounded-full px-3 py-1 font-mono text-xs">
        {url}
      </span>
      {toolbar}
    </div>
    {children}
  </div>
);

const MockButton = ({
  children,
  highlighted = false,
}: {
  children: ReactNode;
  highlighted?: boolean;
}) => (
  <span
    className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium ${
      highlighted
        ? "bg-brand text-brand-foreground border-transparent"
        : "border-border text-muted-foreground"
    }`}
  >
    {children}
  </span>
);

export const ExtensionsPageIllustration = () => (
  <Figure
    caption="chrome://extensions after steps 3 to 5: Developer mode on, the folder loaded, Zam in the list."
    label="Chrome extensions page with Developer mode switched on, the Load unpacked button highlighted, and the Zam extension card listed."
  >
    <BrowserFrame url="chrome://extensions">
      <div className="border-border flex items-center justify-between gap-3 border-b px-4 py-3">
        <span className="text-sm font-medium">Extensions</span>
        <span className="flex items-center gap-2 text-xs">
          <StepMarker step={3} />
          Developer mode
          <Toggle />
        </span>
      </div>
      <div className="border-border flex flex-wrap items-center gap-2 border-b px-4 py-3">
        <MockButton highlighted>Load unpacked</MockButton>
        <StepMarker step={4} />
        <MockButton>Pack extension</MockButton>
        <MockButton>Update</MockButton>
      </div>
      <div className="bg-background/60 p-4">
        <div className="bg-card border-border flex max-w-sm flex-col gap-3 rounded-xl border p-4">
          <div className="flex items-start gap-3">
            <img
              alt=""
              className="size-9 shrink-0 rounded-lg"
              src="/brand/zam-mark.svg"
            />
            <div className="flex min-w-0 flex-col gap-1">
              <span className="flex items-center gap-2 text-sm font-medium">
                Zam
                <StepMarker step={5} />
              </span>
              <span className="text-muted-foreground text-xs leading-snug">
                Capture bugs with screen recording, console, network and
                application storage, saved to your Google Drive.
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex gap-2">
              <MockButton>Details</MockButton>
              <MockButton>Remove</MockButton>
            </span>
            <Toggle />
          </div>
        </div>
      </div>
    </BrowserFrame>
  </Figure>
);

export const PinIllustration = () => (
  <Figure
    caption="The puzzle-piece menu next to the address bar, with Zam pinned."
    label="Browser toolbar with the extensions menu open and the pin button next to Zam highlighted."
  >
    <BrowserFrame
      toolbar={
        <span className="flex items-center gap-2">
          <StepMarker step={1} />
          <span className="bg-card grid size-6 place-items-center rounded-full">
            <Puzzle className="size-3.5" />
          </span>
        </span>
      }
      url="your-app.example.com"
    >
      <div className="flex justify-end p-4">
        <div className="bg-popover border-border flex w-60 flex-col gap-1 rounded-xl border p-2 shadow-[0_8px_24px_-12px_rgb(8_8_8/0.3)]">
          <span className="text-muted-foreground px-2 py-1 text-xs">
            Extensions
          </span>
          <span className="flex items-center gap-2 rounded-lg px-2 py-1.5">
            <img alt="" className="size-5 rounded" src="/brand/zam-mark.svg" />
            <span className="flex-1 text-sm">Zam</span>
            <span className="bg-brand text-brand-foreground grid size-6 place-items-center rounded-full">
              <Pin className="size-3.5" />
            </span>
          </span>
        </div>
      </div>
    </BrowserFrame>
  </Figure>
);

export const PopupIllustration = () => (
  <Figure
    caption="The Zam popup once you are signed in."
    label="Zam extension popup with the Start recording button highlighted."
  >
    <div className="bg-card border-border flex w-full max-w-80 flex-col gap-3 rounded-2xl border p-4 shadow-[0_12px_32px_-16px_rgb(8_8_8/0.25)]">
      <span className="flex items-center gap-2">
        <span className="bg-muted size-7 rounded-full" />
        <span className="flex flex-1 flex-col gap-1">
          <span className="bg-muted h-2 w-24 rounded-full" />
          <span className="bg-muted h-2 w-32 rounded-full" />
        </span>
      </span>
      <span className="bg-border h-px" />
      <span className="flex items-center gap-2">
        <span className="bg-brand text-brand-foreground flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium">
          <Video className="size-4" />
          Start recording
        </span>
        <StepMarker step={2} />
      </span>
      <span className="bg-border h-px" />
      <span className="text-muted-foreground text-center text-sm">
        Open dashboard
      </span>
    </div>
  </Figure>
);
