import type { ClientEnvironment } from "@zam/capture/domain/value-objects/client-environment";
import type { DevtoolsSnapshot } from "@zam/capture/domain/value-objects/devtools-snapshot";
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
} from "@/entities/bug-report";

const byTimestamp = (a: { timestamp: number }, b: { timestamp: number }) =>
  a.timestamp - b.timestamp;

/** Must render inside `ReportPlayback.Provider`. */
export const ReportDevtools = ({
  devtools,
  environment,
  pageUrl,
  recording,
  steps,
  storage,
}: {
  devtools: DevtoolsSnapshot;
  environment: ClientEnvironment | null;
  pageUrl: string | null;
  recording: { durationMs: number; startedAt: Date };
  steps: readonly UserStep[];
  storage: StorageSnapshot;
}) => {
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

  return (
    <Tabs className="flex h-full min-h-0 flex-col" defaultValue="console">
      <TabsList className="shrink-0">
        <TabsTrigger value="info">Info</TabsTrigger>
        <TabsTrigger value="console">
          Console{errorCount > 0 ? ` (${errorCount})` : ""}
        </TabsTrigger>
        <TabsTrigger value="network">
          Network{failedCount > 0 ? ` (${failedCount})` : ""}
        </TabsTrigger>
        <TabsTrigger value="steps">Steps</TabsTrigger>
        <TabsTrigger value="application">Application</TabsTrigger>
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
      <TabsContent className="min-h-0" value="application">
        <div className="h-full">
          <ApplicationStorage storage={storage} />
        </div>
      </TabsContent>
    </Tabs>
  );
};
