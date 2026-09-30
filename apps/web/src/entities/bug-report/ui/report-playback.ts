import { ReportPlaybackProvider } from "../model/report-playback-context";
import { ConsoleEntriesTable } from "./console-entries-table";
import { NetworkRequestsTable } from "./network-requests-table";
import { ReportVideo } from "./report-video";

/** Video and devtools lists sharing one playhead; parts must render inside `Provider`. */
export const ReportPlayback = {
  ConsoleEntries: ConsoleEntriesTable,
  NetworkRequests: NetworkRequestsTable,
  Provider: ReportPlaybackProvider,
  Video: ReportVideo,
};
