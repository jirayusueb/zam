import { useNavigate, useSearch } from "@tanstack/react-router";

import type { ReportSearchParams } from "./report-search-params";

/** Every devtools tab/filter/selection for `/r/$reportId`, kept in the URL. */
export const useReportSearch = (): ReportSearchParams =>
  useSearch({ from: "/r/$reportId" });

/** Patches the current report search params, replacing history (no back-stack spam). */
export const useUpdateReportSearch = () => {
  const navigate = useNavigate({ from: "/r/$reportId" });
  return (changes: Partial<ReportSearchParams>) =>
    navigate({
      replace: true,
      search: (previous) => ({ ...previous, ...changes }),
    });
};
