import type { ClientEnvironment } from "@zam/capture/domain/value-objects/client-environment";
import {
  AppWindow,
  Clock,
  Gauge,
  Globe,
  Languages,
  Laptop,
  Link2,
  Maximize,
  Monitor,
  Terminal,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { CopyValueButton } from "./copy-value-button";
import { PageUrlLink } from "./page-url-link";

const TIME_FORMAT = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "medium",
});

const InfoRow = ({
  copyValue,
  icon: Icon,
  label,
  value,
}: {
  copyValue?: string;
  icon: LucideIcon;
  label: string;
  value: ReactNode;
}) => (
  <div className="flex items-start gap-3 py-2.5">
    <Icon
      aria-hidden
      className="text-muted-foreground mt-0.5 size-4 shrink-0"
    />
    <dt className="text-muted-foreground w-28 shrink-0 text-xs">{label}</dt>
    <dd className="min-w-0 flex-1 truncate text-sm">{value}</dd>
    {copyValue ? <CopyValueButton label={label} value={copyValue} /> : null}
  </div>
);

/** Chrome DevTools-style Info panel: report timing plus the reporter's captured environment. */
export const ReportInfo = ({
  environment,
  pageUrl,
  recording,
}: {
  environment: ClientEnvironment | null;
  pageUrl: string | null;
  recording: { durationMs: number; startedAt: Date };
}) => {
  const endedAt = new Date(
    recording.startedAt.getTime() + recording.durationMs
  );

  return (
    <dl className="divide-border divide-y">
      {pageUrl ? (
        <InfoRow
          copyValue={pageUrl}
          icon={Link2}
          label="URL"
          value={<PageUrlLink href={pageUrl} />}
        />
      ) : null}
      <InfoRow
        icon={Clock}
        label="Timestamp"
        value={`${TIME_FORMAT.format(recording.startedAt)} – ${TIME_FORMAT.format(endedAt)}`}
      />
      {environment ? (
        <>
          <InfoRow
            copyValue={environment.browser}
            icon={AppWindow}
            label="Browser"
            value={environment.browser}
          />
          <InfoRow
            copyValue={environment.os}
            icon={Laptop}
            label="OS"
            value={environment.os}
          />
          <InfoRow
            icon={Maximize}
            label="Viewport"
            value={`${environment.viewport.width} × ${environment.viewport.height}`}
          />
          <InfoRow
            icon={Monitor}
            label="Screen"
            value={`${environment.screen.width} × ${environment.screen.height}`}
          />
          <InfoRow
            copyValue={environment.language}
            icon={Languages}
            label="Language"
            value={environment.language}
          />
          <InfoRow
            copyValue={environment.timeZone}
            icon={Globe}
            label="Time zone"
            value={environment.timeZone}
          />
          {environment.connection ? (
            <InfoRow
              icon={Gauge}
              label="Network speed"
              value={`${environment.connection.effectiveType} · ${environment.connection.downlinkMbps} Mbps`}
            />
          ) : null}
          <InfoRow
            copyValue={environment.userAgent}
            icon={Terminal}
            label="User agent"
            value={environment.userAgent}
          />
        </>
      ) : (
        <p className="text-muted-foreground py-4 text-sm italic">
          Environment wasn&apos;t captured for this report.
        </p>
      )}
    </dl>
  );
};
