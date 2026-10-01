import { useNavigate, useSearch } from "@tanstack/react-router";

import type { ReportSearchParams } from "./report-search-params";

/** Every devtools tab/filter/selection for `/r/$reportId`, kept in the URL. */
export const useReportSearch = (): ReportSearchParams =>
  useSearch({ from: "/r/$reportId" });

/**
 * Patches the current report search params, replacing history (no back-stack spam).
 * `resetScroll: false`: these are in-page view changes; the router's default scroll-to-top
 * on navigation made the page jump on every tab, chip or row click.
 */
export const useUpdateReportSearch = () => {
  const navigate = useNavigate({ from: "/r/$reportId" });
  return (changes: Partial<ReportSearchParams>) =>
    navigate({
      replace: true,
      resetScroll: false,
      search: (previous) => ({ ...previous, ...changes }),
      // Also needed where the browser lacks view-transition types and ignores the router's per-type opt-out.
      viewTransition: false,
    });
};
