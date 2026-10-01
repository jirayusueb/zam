import type { ClientEnvironment } from "@zam/capture/domain/value-objects/client-environment";
import type { DevtoolsSnapshot } from "@zam/capture/domain/value-objects/devtools-snapshot";
import type { ReportMetadata } from "@zam/capture/domain/value-objects/report-metadata";
import type { StorageSnapshot } from "@zam/capture/domain/value-objects/storage-snapshot";
import type { UserStep } from "@zam/capture/domain/value-objects/user-step";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@zam/ui/components/tabs";
import { useMemo } from "react";

import {
  ApplicationStorage,
  isFailedRequest,
  ReportInfo,
  ReportPlayback,
  REPORT_TABS,
  useReportSearch,
  useUpdateReportSearch,
} from "@/entities/bug-report";
import type { ReportTab } from "@/entities/bug-report";
import { ReportMetadataEditor } from "@/features/edit-report";

const byTimestamp = (a: { timestamp: number }, b: { timestamp: number }) =>
  a.timestamp - b.timestamp;

/** Must render inside `ReportPlayback.Provider`. */
export const ReportDevtools = ({
  canEdit,
  devtools,
  environment,
  metadata,
  pageUrl,
  recording,
  reportId,
  steps,
  storage,
}: {
  canEdit: boolean;
  devtools: DevtoolsSnapshot;
  environment: ClientEnvironment | null;
  metadata: ReportMetadata;
  pageUrl: string | null;
  recording: { durationMs: number; startedAt: Date };
  reportId: string;
  steps: readonly UserStep[];
  storage: StorageSnapshot;
}) => {
  const search = useReportSearch();
  const update = useUpdateReportSearch();
  const tab = search.tab ?? "console";

  // Network entries are buffered on completion, so they arrive out of start order.
  const network = useMemo(
    () => devtools.network.toSorted(byTimestamp),
    [devtools.network]
  );
  const consoleEntries = useMemo(
    () => devtools.console.toSorted(byTimestamp),
    [devtools.console]
  );
  const errorCount = useMemo(
    () => consoleEntries.filter((entry) => entry.level === "error").length,
    [consoleEntries]
  );
  const failedCount = useMemo(
    () => network.filter(isFailedRequest).length,
    [network]
  );

  const TAB_LABELS: Record<ReportTab, string> = {
    application: "Application",
    console: `Console${errorCount > 0 ? ` (${errorCount})` : ""}`,
    info: "Info",
    metadata: "MetaData",
    network: `Network${failedCount > 0 ? ` (${failedCount})` : ""}`,
    steps: "Steps",
  };

  return (
    <Tabs
      className="flex h-full min-h-0 flex-col"
      onValueChange={(next) =>
        update({ tab: next === "console" ? undefined : (next as ReportTab) })
      }
      value={tab}
    >
      {/* The strip scrolls itself on narrow screens; otherwise focusing a tab scrolls the whole clipped panel sideways. */}
      <TabsList className="max-w-full shrink-0 justify-start overflow-x-auto">
        {REPORT_TABS.map((value) => (
          <TabsTrigger className="flex-none" key={value} value={value}>
            {TAB_LABELS[value]}
          </TabsTrigger>
        ))}
      </TabsList>
      <TabsContent className="min-h-0" value="info">
        <div className="h-full overflow-auto px-1">
          <ReportInfo
            environment={environment}
            pageUrl={pageUrl}
            recording={recording}
          />
        </div>
      </TabsContent>
      <TabsContent className="min-h-0" value="console">
        <div className="h-full">
          <ReportPlayback.ConsoleEntries
            entries={consoleEntries}
            network={network}
          />
        </div>
      </TabsContent>
      <TabsContent className="min-h-0" value="network">
        <div className="h-full">
          <ReportPlayback.NetworkRequests requests={network} />
        </div>
      </TabsContent>
      <TabsContent className="min-h-0" value="steps">
        <div className="h-full">
          <ReportPlayback.Steps network={network} steps={steps} />
        </div>
      </TabsContent>
      <TabsContent className="min-h-0" value="metadata">
        <div className="h-full overflow-auto px-1">
          <ReportMetadataEditor
            canEdit={canEdit}
            metadata={metadata}
            reportId={reportId}
          />
        </div>
      </TabsContent>
      <TabsContent className="min-h-0" value="application">
        <div className="h-full">
          <ApplicationStorage storage={storage} />
        </div>
      </TabsContent>
    </Tabs>
  );
};
