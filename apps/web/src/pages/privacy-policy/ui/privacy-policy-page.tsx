import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

/*
 * Operator and contact are defaults chosen without an answer from the owner:
 * change OPERATOR / CONTACT_URL (and LAST_UPDATED) when that changes.
 * Every factual statement below mirrors the code; update this page when
 * packages/db/src/schema, packages/auth or the extension's capture changes.
 */
const OPERATOR = "jirayusueb";
const CONTACT_URL = "https://github.com/jirayusueb/zam/issues";
const LAST_UPDATED = new Date("2026-09-30");

const SECTIONS = [
  { id: "who", title: "Who runs Zam" },
  { id: "collect", title: "What Zam collects" },
  { id: "video", title: "Your video" },
  { id: "extension", title: "The browser extension" },
  { id: "google", title: "Google account data" },
  { id: "sharing", title: "Who can see a report" },
  { id: "services", title: "Services Zam runs on" },
  { id: "cookies", title: "Cookies" },
  { id: "deletion", title: "Keeping and deleting data" },
  { id: "changes", title: "Changes" },
  { id: "contact", title: "Contact" },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

const Section = ({ id, children }: { id: SectionId; children: ReactNode }) => (
  <section
    aria-labelledby={`${id}-title`}
    className="flex scroll-mt-24 flex-col gap-4"
    id={id}
  >
    <h2 className="font-display text-headline" id={`${id}-title`}>
      {SECTIONS.find((section) => section.id === id)?.title}
    </h2>
    {children}
  </section>
);

const ExternalLink = ({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) => (
  <a
    className="decoration-foreground/30 hover:decoration-foreground underline underline-offset-4"
    href={href}
    rel="noopener noreferrer"
    target="_blank"
  >
    {children}
  </a>
);

const DataList = ({
  items,
}: {
  items: { term: string; detail: ReactNode }[];
}) => (
  <dl className="bg-card divide-border divide-y rounded-2xl">
    {items.map((item) => (
      <div
        className="grid gap-1 px-5 py-4 sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-6"
        key={item.term}
      >
        <dt className="text-sm font-medium">{item.term}</dt>
        <dd className="text-muted-foreground text-sm leading-relaxed">
          {item.detail}
        </dd>
      </div>
    ))}
  </dl>
);

const Code = ({ children }: { children: ReactNode }) => (
  <code className="bg-muted rounded px-1 py-0.5 font-mono text-[0.85em]">
    {children}
  </code>
);

export const PrivacyPolicyPage = () => (
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
      <header className="flex flex-col gap-4">
        <h1 className="font-display text-display font-[380] sm:text-[72px]">
          Privacy policy
        </h1>
        <p className="text-muted-foreground text-sm">
          Last updated{" "}
          <time dateTime={LAST_UPDATED.toISOString().slice(0, 10)}>
            {LAST_UPDATED.toLocaleDateString("en", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </time>
        </p>
        <p className="text-lg">
          Zam records a bug once and gives engineers one link with the video,
          the console and the network requests. The video stays in your own
          Google Drive. Zam keeps the report details and logs, and nothing is
          sold, shared with advertisers or used for tracking.
        </p>
      </header>

      <Section id="who">
        <p>
          Zam is operated by {OPERATOR}. The source code is public at{" "}
          <ExternalLink href="https://github.com/jirayusueb/zam">
            github.com/jirayusueb/zam
          </ExternalLink>
          , so you can check everything on this page against what the app
          actually does.
        </p>
      </Section>

      <Section id="collect">
        <p>When you sign in and create reports, Zam stores:</p>
        <DataList
          items={[
            {
              detail:
                "Your name, email address and profile picture, as provided by Google sign-in.",
              term: "Account",
            },
            {
              detail: (
                <>
                  An access token and refresh token from Google, stored
                  encrypted, so Zam can upload your videos to your Drive. See{" "}
                  <a className="underline underline-offset-4" href="#google">
                    Google account data
                  </a>
                  .
                </>
              ),
              term: "Google tokens",
            },
            {
              detail:
                "For each signed-in session: when it started and expires, the IP address and the browser’s user agent. These keep you signed in and protect the session.",
              term: "Sessions",
            },
            {
              detail:
                "The report title, the address of the page you recorded, when the recording started and how long it lasted, and the video's file type and size.",
              term: "Reports",
            },
            {
              detail: (
                <>
                  Console messages (log, info, warn, error, debug, and uncaught
                  errors) and fetch/XHR requests (method, URL, status code,
                  duration, request and response headers, and text bodies up to
                  2,000 characters) from the recording. Values of authorization,
                  cookie and API-key headers, and query parameters whose names
                  look like secrets (tokens, keys, passwords), are replaced with{" "}
                  <Code>[REDACTED]</Code> before they leave your browser. Binary
                  bodies are not collected.
                </>
              ),
              term: "Console and network",
            },
            {
              detail:
                "What you clicked (the element’s tag, id, classes and visible label), the pages you navigated to, and when the tab was hidden or shown. The text you type into fields is never read.",
              term: "Steps",
            },
            {
              detail: (
                <>
                  The recorded tab’s cookies, localStorage and sessionStorage at
                  the moment you stop. Values of HttpOnly cookies and of entries
                  whose names look like secrets are replaced with{" "}
                  <Code>[REDACTED]</Code> before they leave your browser.
                </>
              ),
              term: "Storage",
            },
            {
              detail:
                "Your browser and version, operating system, user agent, window and screen size, language, time zone, and connection type and speed.",
              term: "Browser details",
            },
            {
              detail:
                "Comments you post on a report, with your name and the time.",
              term: "Comments",
            },
            {
              detail:
                "The Google Drive ID of each uploaded video, so the report can play it.",
              term: "Drive file ID",
            },
          ]}
        />
        <p className="text-muted-foreground text-sm">
          Console messages, request bodies, storage and page addresses come from
          the site you were testing and may contain whatever that site logged or
          stored. Check the report before sharing its link: anyone with the link
          can see it.
        </p>
      </Section>

      <Section id="video">
        <p>
          The extension uploads the recording directly from your browser to your
          Google Drive. Zam never stores video files.
        </p>
        <p>
          When you publish a report, Zam sets the video in your Drive to{" "}
          <strong className="font-medium">anyone with the link can view</strong>
          , so engineers without access to your Drive can watch it. When someone
          plays the video on a report page, it is streamed from Google Drive
          through Zam’s server to their browser; Zam passes it through and does
          not keep a copy. You can change the sharing or delete the file in
          Google Drive at any time; the video then stops playing on the report.
        </p>
      </Section>

      <Section id="extension">
        <p>
          The Zam extension asks for access to all sites because a bug can be on
          any site. To capture what happened before you pressed record, it keeps
          a rolling log of recent console messages, network requests and clicks
          in the memory of each page you open (up to 1,000 of each). That log
          stays in your browser and is cleared when the page closes.
        </p>
        <p>
          Only when you stop a recording does the extension read the log of the
          tab you recorded, keep the entries from the recording window, read
          that tab’s cookies, storage and browser details, and send them to Zam
          with the report. Nothing from other tabs, and nothing outside a
          recording, is sent.
        </p>
        <p>
          It also uses browser storage to remember the current recording and an
          offscreen document to run the recorder. See the{" "}
          <Link
            className="underline underline-offset-4"
            to="/docs/install-extension"
          >
            install guide
          </Link>{" "}
          for each permission it asks for.
        </p>
      </Section>

      <Section id="google">
        <p>
          Zam signs you in with Google and asks for one Google Drive permission,{" "}
          <Code>drive.file</Code>. That permission only lets Zam see and manage
          files it created in your Drive. Zam cannot read, list or change any of
          your other files.
        </p>
        <p>
          Zam uses this access only to upload your recordings, set their link
          sharing, and stream them to people who open your report. Zam’s use and
          transfer of information received from Google APIs adheres to the{" "}
          <ExternalLink href="https://developers.google.com/terms/api-services-user-data-policy">
            Google API Services User Data Policy
          </ExternalLink>
          , including the Limited Use requirements. Google data is not used for
          advertising, not sold, and not transferred to anyone else.
        </p>
        <p>
          You can remove Zam’s access at any time from{" "}
          <ExternalLink href="https://myaccount.google.com/connections">
            your Google account’s third-party connections
          </ExternalLink>
          . Zam streams report videos using your Google access, so removing it
          stops the videos on all your reports from playing, and new uploads
          stop until you sign in again. The logs and comments stay until you ask
          for them to be deleted.
        </p>
      </Section>

      <Section id="sharing">
        <p>
          Every report has a share link with a long random ID in it (
          <Code>/r/…</Code>). The link is how access works:
        </p>
        <ul className="flex list-disc flex-col gap-2 pl-5">
          <li>
            Anyone who has the link can see the report: its title, page address,
            console and network logs, and the video.
          </li>
          <li>
            Anyone signed in to Zam who has the link can read and post comments
            on it.
          </li>
          <li>Your list of reports on the dashboard is visible only to you.</li>
        </ul>
        <p>Share a report link only with people who should see it.</p>
      </Section>

      <Section id="services">
        <p>Zam runs on these services, which process data on its behalf:</p>
        <DataList
          items={[
            {
              detail: "Hosts the web app and its server code.",
              term: "Cloudflare",
            },
            {
              detail:
                "Hosts the database with accounts, sessions, reports, logs and comments.",
              term: "Neon (Postgres)",
            },
            {
              detail: "Sign-in, and storage of your videos in your own Drive.",
              term: "Google",
            },
          ]}
        />
        <p>Zam has no analytics, advertising or tracking scripts.</p>
      </Section>

      <Section id="cookies">
        <p>
          Zam sets only the cookies needed to keep you signed in. There are no
          analytics or advertising cookies.
        </p>
      </Section>

      <Section id="deletion">
        <p>
          Zam keeps your account, reports and comments until you ask for them to
          be deleted. There is no delete button in the app yet, so ask through
          the{" "}
          <a className="underline underline-offset-4" href="#contact">
            contact
          </a>{" "}
          below. Deleting your account also deletes your sessions, stored Google
          tokens, reports, their logs, and your comments.
        </p>
        <p>
          Videos live in your Google Drive, so you delete them there yourself.
        </p>
      </Section>

      <Section id="changes">
        <p>
          If this policy changes, the new version is published on this page with
          a new date at the top. Changes are also visible in the public source
          history.
        </p>
      </Section>

      <Section id="contact">
        <p>
          For questions, access or deletion requests, open an issue at{" "}
          <ExternalLink href={CONTACT_URL}>
            github.com/jirayusueb/zam/issues
          </ExternalLink>
          . Issues are public: do not include private details there; say you
          need a private reply and one will be arranged.
        </p>
        <p className="text-muted-foreground text-sm">
          Back to{" "}
          <Link className="underline underline-offset-4" to="/">
            Zam
          </Link>
          .
        </p>
      </Section>
    </article>
  </main>
);
