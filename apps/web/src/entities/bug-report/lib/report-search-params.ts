import type { ConsoleFilter } from "./console-rows";
import type { NetworkDetailTab } from "./network-detail";
import type { NetworkTypeFilter } from "./network-type";
import type { StepFilter } from "./report-steps";
import type { ReportTab } from "./report-tabs";
import type { StorageArea } from "./storage-area";

/** Every devtools tab/filter/selection stored in the `/r/$reportId` URL. */
export interface ReportSearchParams {
  tab?: ReportTab;
  console?: ConsoleFilter;
  q?: string;
  type?: NetworkTypeFilter;
  errors?: boolean;
  method?: string;
  nq?: string;
  req?: number;
  detail?: NetworkDetailTab;
  steps?: StepFilter;
  storage?: StorageArea;
  cookie?: string;
  key?: string;
}
