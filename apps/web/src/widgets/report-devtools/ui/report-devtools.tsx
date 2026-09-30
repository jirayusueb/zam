import type { DevtoolsSnapshot } from "@zam/capture/domain/value-objects/devtools-snapshot";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@zam/ui/components/tabs";
import { useMemo } from "react";

import { ReportPlayback } from "@/entities/bug-report";

const byTimestamp = (a: { timestamp: number }, b: { timestamp: number }) =>
  a.timestamp - b.timestamp;

/** Must render inside `ReportPlayback.Provider`. */
export const ReportDevtools = ({
  devtools,
}: {
  devtools: DevtoolsSnapshot;
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

  return (
    <Tabs defaultValue="console">
      <TabsList>
        <TabsTrigger value="console">
          Console ({consoleEntries.length})
        </TabsTrigger>
        <TabsTrigger value="network">Network ({network.length})</TabsTrigger>
      </TabsList>
      <TabsContent value="console">
        <div className="h-[480px]">
          <ReportPlayback.ConsoleEntries entries={consoleEntries} />
        </div>
      </TabsContent>
      <TabsContent value="network">
        <div className="h-[480px]">
          <ReportPlayback.NetworkRequests requests={network} />
        </div>
      </TabsContent>
    </Tabs>
  );
};
