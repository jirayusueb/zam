import { Link } from "@tanstack/react-router";
import { buttonVariants } from "@zam/ui/components/button";
import type { ReactNode } from "react";

import {
  EXTENSION_RELEASES_URL,
  extensionDownloadPath,
} from "@/shared/config/extension";

import {
  ChromeIcon,
  ExtensionsPageIllustration,
  FirefoxIcon,
  InstallOverview,
  PinIllustration,
  PopupIllustration,
  stepLabel,
} from "./install-illustrations";

/*
 * Every step mirrors the shipped extension: button labels come from
 * apps/extension (popup, editor), permissions from apps/extension/wxt.config.ts.
 * Update this page when either changes.
 */
const SECTIONS = [
  { id: "before", title: "Before you start" },
  { icon: ChromeIcon, id: "chrome", title: "Install in Chrome" },
  { id: "sign-in", title: "Pin and sign in" },
  { id: "first-report", title: "Record your first bug" },
  { icon: FirefoxIcon, id: "firefox", title: "Firefox" },
  { id: "permissions", title: "Why it asks for these permissions" },
  { id: "update", title: "Updating and removing" },
  { id: "troubleshooting", title: "Troubleshooting" },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

const Section = ({ id, children }: { id: SectionId; children: ReactNode }) => {
  const section = SECTIONS.find((item) => item.id === id);
  const Icon = section && "icon" in section ? section.icon : null;
  return (
    <section
      aria-labelledby={`${id}-title`}
      className="flex scroll-mt-24 flex-col gap-4"
      id={id}
    >
      <h2
        className="font-display text-headline flex items-center gap-3"
        id={`${id}-title`}
      >
        {Icon ? <Icon className="size-[0.8em] shrink-0" /> : null}
        {section?.title}
      </h2>
      {children}
    </section>
  );
};

const Code = ({ children }: { children: ReactNode }) => (
  <code className="bg-muted rounded px-1 py-0.5 font-mono text-[0.85em]">
    {children}
  </code>
);

const Ui = ({ children }: { children: ReactNode }) => (
  <strong className="font-medium">{children}</strong>
);

/** Numbered steps on a card, the step number set in mono like the rest of Zam's evidence. */
const Steps = ({ steps }: { steps: ReactNode[] }) => (
  <ol className="bg-card divide-border divide-y rounded-2xl">
    {steps.map((step, index) => (
      <li
        className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-2 px-5 py-4"
        // Steps are static, ordered content; the position is the identity.
        // oxlint-disable-next-line react/no-array-index-key
        key={index}
      >
        <span className="text-muted-foreground font-mono text-sm tabular-nums">
          {stepLabel(index + 1)}
        </span>
        <div className="text-sm leading-relaxed">{step}</div>
      </li>
    ))}
  </ol>
);

const DataList = ({
  items,
}: {
  items: { term: ReactNode; detail: ReactNode; key: string }[];
}) => (
  <dl className="bg-card divide-border divide-y rounded-2xl">
    {items.map((item) => (
      <div
        className="grid gap-1 px-5 py-4 sm:grid-cols-[13rem_minmax(0,1fr)] sm:gap-6"
        key={item.key}
      >
        <dt className="text-sm font-medium">{item.term}</dt>
        <dd className="text-muted-foreground text-sm leading-relaxed">
          {item.detail}
        </dd>
      </div>
    ))}
  </dl>
);

export const InstallExtensionPage = () => (
  <main className="mx-auto grid w-full max-w-[1200px] gap-12 px-5 pt-10 pb-24 md:px-10 md:pt-16 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-16">
    <nav
      aria-label="On this page"
      className="hidden lg:sticky lg:top-8 lg:block lg:self-start"
    >
      <ol className="flex flex-col gap-1 text-sm">
        {SECTIONS.map((section) => (
          <li key={section.id}>
            <a
              className="text-muted-foreground hover:text-foreground ease-intent block rounded-lg py-1 transition-colors duration-500"
              href={`#${section.id}`}
            >
              {section.title}
            </a>
          </li>
        ))}
      </ol>
    </nav>

    <article className="flex max-w-[68ch] flex-col gap-12 text-base leading-relaxed">
      <header className="flex flex-col gap-6">
        <p className="text-muted-foreground font-mono text-xs">
          Docs · Extension
        </p>
        <h1 className="font-display text-display font-[380] text-balance sm:text-[72px]">
          Install the Zam extension
        </h1>
        <p className="text-muted-foreground text-lg">
          The extension records your screen and collects the console, network,
          steps and storage of the tab you test. It isn’t in the Chrome Web
          Store yet, so you install it from a zip file. It takes about two
          minutes.
        </p>
        <div className="flex flex-wrap gap-3">
          <a
            className={buttonVariants({ size: "lg" })}
            href={extensionDownloadPath("chrome")}
          >
            <ChromeIcon />
            Download for Chrome
          </a>
          <a
            className={buttonVariants({ size: "lg", variant: "outline" })}
            href={extensionDownloadPath("firefox")}
          >
            <FirefoxIcon />
            Download for Firefox
          </a>
        </div>
        <InstallOverview />
      </header>

      <Section id="before">
        <ul className="flex list-disc flex-col gap-2 pl-5">
          <li>
            A desktop Chromium browser: Chrome, Edge, Brave or Arc. The Chrome
            zip works in all of them.
          </li>
          <li>
            A Google account. Recordings are saved to your own Google Drive.
          </li>
          <li>
            Firefox works for testing only; see{" "}
            <a className="underline underline-offset-4" href="#firefox">
              Firefox
            </a>
            .
          </li>
        </ul>
      </Section>

      <Section id="chrome">
        <Steps
          steps={[
            <>
              <a
                className="underline underline-offset-4"
                href={extensionDownloadPath("chrome")}
              >
                Download the Chrome zip
              </a>{" "}
              (<Code>extension-&lt;version&gt;-chrome.zip</Code>) and unzip it.
              Keep the folder somewhere permanent: the browser loads the
              extension from it every time it starts.
            </>,
            <>
              Open <Code>chrome://extensions</Code> in the address bar (Edge:{" "}
              <Code>edge://extensions</Code>, Brave:{" "}
              <Code>brave://extensions</Code>).
            </>,
            <>
              Turn on <Ui>Developer mode</Ui>, top right.
            </>,
            <>
              Click <Ui>Load unpacked</Ui> and choose the unzipped folder, the
              one that contains <Code>manifest.json</Code>.
            </>,
            <>
              Zam appears in the list. Chrome shows the permissions it uses;{" "}
              <a className="underline underline-offset-4" href="#permissions">
                here is why each one is needed
              </a>
              .
            </>,
          ]}
        />
        <ExtensionsPageIllustration />
      </Section>

      <Section id="sign-in">
        <Steps
          steps={[
            <>
              Click the puzzle-piece icon next to the address bar and pin{" "}
              <Ui>Zam</Ui> so it stays in the toolbar.
            </>,
            <>
              Click the Zam icon, then <Ui>Sign in with Google</Ui>. A Zam tab
              opens; sign in there.
            </>,
            <>
              Google asks for access to Drive files that Zam creates (
              <Code>drive.file</Code>). Zam can’t see anything else in your
              Drive.
            </>,
          ]}
        />
        <PinIllustration />
      </Section>

      <Section id="first-report">
        <Steps
          steps={[
            <>Open the page with the bug.</>,
            <>
              Click the Zam icon, then <Ui>Start recording</Ui>. Pick the tab,
              window or screen to record.
            </>,
            <>
              Reproduce the bug, then click <Ui>Stop recording</Ui>. Recordings
              can be up to 5 minutes long.
            </>,
            <>
              An editor tab opens. Optionally select parts to remove and click{" "}
              <Ui>Cut selection</Ui>, then <Ui>Publish report</Ui>.
            </>,
            <>
              The report opens in a new tab. Copy its link and send it to the
              engineer.
            </>,
          ]}
        />
        <PopupIllustration />
        <p className="text-muted-foreground text-sm">
          Console and network logs come from pages that were open after the
          extension was installed. Reload a tab that was already open before you
          record it.
        </p>
      </Section>

      <Section id="firefox">
        <p>
          Firefox only runs extensions that Mozilla has signed, and Zam isn’t
          signed yet. You can still load it until Firefox restarts:
        </p>
        <Steps
          steps={[
            <>
              <a
                className="underline underline-offset-4"
                href={extensionDownloadPath("firefox")}
              >
                Download the Firefox zip
              </a>
              . Don’t unzip it.
            </>,
            <>
              Open <Code>about:debugging#/runtime/this-firefox</Code>.
            </>,
            <>
              Click <Ui>Load Temporary Add-on…</Ui> and choose the zip.
            </>,
          ]}
        />
        <p className="text-muted-foreground text-sm">
          Firefox removes temporary add-ons when it closes, and doesn’t report
          network speed, so the Info tab of Firefox reports shows less.
        </p>
      </Section>

      <Section id="permissions">
        <DataList
          items={[
            {
              detail:
                "A bug can be on any site. Zam keeps a log of console messages, network requests and your clicks in each page’s memory, so the log already exists when you press record. Only the recorded tab’s log from the recording window is sent, when you stop.",
              key: "all-sites",
              term: "Read and change all your data on all websites",
            },
            {
              detail:
                "Reads the recorded tab’s cookies at stop for the report’s Application tab. HttpOnly cookie values and secret-looking names are replaced with [REDACTED] before they leave your browser.",
              key: "cookies",
              term: <Code>cookies</Code>,
            },
            {
              detail:
                "Reads the log, local/session storage and browser details from the recorded tab when you stop.",
              key: "scripting",
              term: <Code>scripting</Code>,
            },
            {
              detail: "Runs the screen recorder in the background.",
              key: "offscreen",
              term: <Code>offscreen</Code>,
            },
            {
              detail:
                "Remembers the recording in progress, so it survives the browser suspending the extension.",
              key: "storage",
              term: <Code>storage</Code>,
            },
          ]}
        />
        <p className="text-muted-foreground text-sm">
          The full list of what a report contains is in the{" "}
          <Link className="underline underline-offset-4" to="/privacy-policy">
            privacy policy
          </Link>
          .
        </p>
      </Section>

      <Section id="update">
        <p>
          Unpacked extensions don’t update themselves. To update, download the
          new zip, unzip it over the old folder, and click the reload arrow on
          Zam’s card in <Code>chrome://extensions</Code>. Every version is
          listed on the{" "}
          <a
            className="underline underline-offset-4"
            href={EXTENSION_RELEASES_URL}
            rel="noopener noreferrer"
            target="_blank"
          >
            releases page
          </a>
          .
        </p>
        <p>
          To remove Zam, click <Ui>Remove</Ui> on its card. Your reports and the
          videos in your Drive stay.
        </p>
      </Section>

      <Section id="troubleshooting">
        <DataList
          items={[
            {
              detail:
                "You chose the zip or a parent folder. Unzip first, then choose the folder that directly contains manifest.json.",
              key: "manifest",
              term: "“Manifest file is missing or unreadable”",
            },
            {
              detail:
                "Chrome warns about developer-mode extensions at startup. Keep Zam enabled; the warning is about installing outside the Web Store.",
              key: "dev-mode",
              term: "“Disable developer mode extensions”",
            },
            {
              detail:
                "Browser pages (chrome://, the Web Store, the new tab page) block extensions. Record a regular website, or reload a tab that was open before you installed Zam.",
              key: "no-logs",
              term: "The report has no console or network entries",
            },
            {
              detail:
                "The Drive permission was declined or expired. Sign out of Zam, sign in again and allow Drive access.",
              key: "upload",
              term: "“Video upload to Google Drive failed”",
            },
          ]}
        />
        <p className="text-muted-foreground text-sm">
          Still stuck?{" "}
          <a
            className="underline underline-offset-4"
            href="https://github.com/jirayusueb/zam/issues"
            rel="noopener noreferrer"
            target="_blank"
          >
            Open an issue
          </a>
          .
        </p>
      </Section>
    </article>
  </main>
);
