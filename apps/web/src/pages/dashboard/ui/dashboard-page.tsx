import { useQuery } from "@tanstack/react-query";
import type { QueryKey } from "@tanstack/react-query";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import type { BugReportSummary } from "@zam/capture/application/ports/bug-report-read-model";
import {
  MAX_PAGE_SIZE,
  MAX_SEARCH_QUERY_LENGTH,
} from "@zam/capture/application/queries/list-my-bug-reports";
import type { BugReportSort } from "@zam/capture/application/query-specifications/bug-report-query";
import {
  REPORT_PRIORITIES,
  REPORT_STATUSES,
} from "@zam/capture/domain/value-objects/triage";
import type {
  ReportPriority,
  ReportStatus,
} from "@zam/capture/domain/value-objects/triage";
import { Button, buttonVariants } from "@zam/ui/components/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyTitle,
} from "@zam/ui/components/empty";
import { Input } from "@zam/ui/components/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@zam/ui/components/native-select";
import { Skeleton } from "@zam/ui/components/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@zam/ui/components/toggle-group";
import { cn } from "@zam/ui/lib/utils";
import { KanbanSquare, List, Search } from "lucide-react";

import {
  BugReportsTable,
  myBugReportsQuery,
  PRIORITY_LABELS,
  STATUS_LABELS,
  TriageStatusGlyph,
} from "@/entities/bug-report";
import { useUrlDraft } from "@/shared/lib/use-url-draft";
import { ReportBoard } from "@/widgets/report-board";

const SKELETON_ROWS = 5;
const PAGE_SIZE = 20;

type DashboardSearch = ReturnType<typeof useDashboardSearch>;
type DashboardView = "list" | "board";

const SORT_LABELS: Record<BugReportSort, string> = {
  newest: "Newest first",
  oldest: "Oldest first",
  priority: "Priority",
  relevance: "Best match",
  title: "Title A–Z",
};

const useDashboardSearch = () => useSearch({ from: "/_private/dashboard" });

const ListSkeleton = () => (
  <div className="bg-card divide-border divide-y rounded-2xl">
    {Array.from({ length: SKELETON_ROWS }, (_, index) => (
      <div className="flex items-center gap-4 px-5 py-4" key={index}>
        <Skeleton className="size-3.5 rounded-full" />
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-4 w-2/5" />
          <Skeleton className="h-3 w-1/4" />
        </div>
        <Skeleton className="h-5 w-24 rounded-full" />
      </div>
    ))}
  </div>
);

const EmptyState = ({
  filtered,
  onClear,
}: {
  filtered: boolean;
  onClear: () => void;
}) =>
  filtered ? (
    <Empty className="bg-card rounded-2xl">
      <EmptyTitle>No reports match</EmptyTitle>
      <EmptyDescription>Try other words or clear the filters.</EmptyDescription>
      <EmptyContent>
        <Button onClick={onClear} variant="outline">
          Clear filters
        </Button>
      </EmptyContent>
    </Empty>
  ) : (
    <Empty className="bg-card rounded-2xl">
      <EmptyTitle>No bug reports yet</EmptyTitle>
      <EmptyDescription>
        Install the Zam extension, press Start recording on the page with the
        bug, and the report lands here.
      </EmptyDescription>
      <EmptyContent>
        <Link className={buttonVariants()} to="/docs/install-extension">
          Install the extension
        </Link>
      </EmptyContent>
    </Empty>
  );

/** Workflow chips: All + one per triage status. List view only; the board shows every status as a column. */
const TriageChips = ({
  onChange,
  value,
}: {
  onChange: (next: ReportStatus | undefined) => void;
  value: ReportStatus | undefined;
}) => (
  <fieldset className="flex flex-wrap gap-1">
    <legend className="sr-only">Filter by status</legend>
    {[undefined, ...REPORT_STATUSES].map((status) => (
      <button
        aria-pressed={value === status}
        className="text-muted-foreground hover:text-foreground aria-pressed:bg-card aria-pressed:text-foreground ease-intent inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-sm transition-colors duration-300 aria-pressed:shadow-[0_1px_2px_#08080814]"
        key={status ?? "all"}
        onClick={() => onChange(status)}
        type="button"
      >
        {status ? <TriageStatusGlyph status={status} /> : null}
        {status ? STATUS_LABELS[status] : "All"}
      </button>
    ))}
  </fieldset>
);

const Toolbar = ({
  search,
  sort,
  update,
  view,
}: {
  search: DashboardSearch;
  /** The sort actually applied (defaults differ between list and board). */
  sort: BugReportSort;
  update: (changes: Partial<DashboardSearch>) => void;
  view: DashboardView;
}) => {
  const [query, onQueryChange] = useUrlDraft(search.q ?? "", (next) =>
    update({ q: next.trim() || undefined, sort: undefined })
  );
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <search className="relative min-w-56 flex-1">
          <Search
            aria-hidden
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
          />
          <Input
            aria-label="Search bug reports"
            className="pl-9"
            maxLength={MAX_SEARCH_QUERY_LENGTH}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search titles and page URLs"
            type="search"
            value={query}
          />
        </search>
        <NativeSelect
          aria-label="Filter by priority"
          onChange={(event) =>
            update({
              priority: (event.target.value || undefined) as
                | ReportPriority
                | undefined,
            })
          }
          value={search.priority ?? ""}
        >
          <NativeSelectOption value="">Any priority</NativeSelectOption>
          {REPORT_PRIORITIES.toReversed().map((priority) => (
            <NativeSelectOption key={priority} value={priority}>
              {PRIORITY_LABELS[priority]}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <NativeSelect
          aria-label="Filter by upload"
          onChange={(event) =>
            update({
              status: (event.target.value || undefined) as
                | BugReportSummary["status"]
                | undefined,
            })
          }
          value={search.status ?? ""}
        >
          <NativeSelectOption value="">Published and drafts</NativeSelectOption>
          <NativeSelectOption value="published">Published</NativeSelectOption>
          <NativeSelectOption value="draft">Drafts</NativeSelectOption>
        </NativeSelect>
        <NativeSelect
          aria-label="Sort by"
          onChange={(event) =>
            update({ sort: event.target.value as BugReportSort })
          }
          value={sort}
        >
          {Object.entries(SORT_LABELS).map(([value, label]) => (
            <NativeSelectOption
              disabled={value === "relevance" && !search.q}
              key={value}
              value={value}
            >
              {label}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>
      {view === "list" ? (
        <TriageChips
          onChange={(triage) => update({ triage })}
          value={search.triage}
        />
      ) : null}
    </div>
  );
};

const Pagination = ({
  onPage,
  page,
  pageCount,
  total,
}: {
  onPage: (page: number) => void;
  page: number;
  pageCount: number;
  total: number;
}) => (
  <nav
    aria-label="Pagination"
    className="flex items-center justify-between gap-2 text-sm"
  >
    <Button
      disabled={page <= 1}
      onClick={() => onPage(page - 1)}
      variant="outline"
    >
      Previous
    </Button>
    <span className="text-muted-foreground font-mono text-xs tabular-nums">
      {page} / {pageCount} · {total} reports
    </span>
    <Button
      disabled={page >= pageCount}
      onClick={() => onPage(page + 1)}
      variant="outline"
    >
      Next
    </Button>
  </nav>
);

const effectiveSort = (
  search: DashboardSearch,
  isBoard: boolean
): BugReportSort => {
  if (search.sort) {
    return search.sort;
  }
  if (search.q) {
    return "relevance";
  }
  return isBoard ? "priority" : "newest";
};

const Results = ({
  data,
  filtered,
  isBoard,
  isLoading,
  listQueryKey,
  onClear,
}: {
  data: { items: BugReportSummary[] } | undefined;
  filtered: boolean;
  isBoard: boolean;
  isLoading: boolean;
  listQueryKey: QueryKey;
  onClear: () => void;
}) => {
  if (isLoading) {
    return <ListSkeleton />;
  }
  if (!data || data.items.length === 0) {
    return <EmptyState filtered={filtered} onClear={onClear} />;
  }
  return isBoard ? (
    <ReportBoard listQueryKey={listQueryKey} reports={data.items} />
  ) : (
    <BugReportsTable reports={data.items} />
  );
};

/** The board ignores the status chip (every status is a column), so it doesn't count there. */
const hasFilters = (search: DashboardSearch, isBoard: boolean): boolean =>
  Boolean(
    search.q || search.status || search.priority || (!isBoard && search.triage)
  );

const ViewToggle = ({
  onChange,
  value,
}: {
  onChange: (next: DashboardView) => void;
  value: DashboardView;
}) => (
  <ToggleGroup
    aria-label="View"
    onValueChange={(next) => {
      const [selected] = next;
      // Re-pressing the active item empties the group; keep the current view instead.
      if (selected === "list" || selected === "board") {
        onChange(selected);
      }
    }}
    value={[value]}
    variant="outline"
  >
    <ToggleGroupItem aria-label="List view" value="list">
      <List aria-hidden />
      List
    </ToggleGroupItem>
    <ToggleGroupItem aria-label="Board view" value="board">
      <KanbanSquare aria-hidden />
      Board
    </ToggleGroupItem>
  </ToggleGroup>
);

const BoardLimitNote = ({ shown, total }: { shown: number; total: number }) =>
  total > shown ? (
    <p className="text-muted-foreground text-xs">
      The board shows the first {shown} of {total} reports. Narrow it with
      search or filters, or use the list.
    </p>
  ) : null;

export const DashboardPage = () => {
  const search = useDashboardSearch();
  const navigate = useNavigate({ from: "/dashboard" });
  const view: DashboardView = search.view ?? "list";
  const isBoard = view === "board";
  const page = isBoard ? 1 : (search.page ?? 1);
  const sort = effectiveSort(search, isBoard);
  // ponytail: the board shows at most MAX_PAGE_SIZE (50) reports; page per column if boards outgrow that.
  const listQuery = myBugReportsQuery({
    page,
    pageSize: isBoard ? MAX_PAGE_SIZE : PAGE_SIZE,
    priority: search.priority,
    query: search.q,
    sort,
    status: search.status,
    triageStatus: isBoard ? undefined : search.triage,
  });
  const { data, isLoading, isPlaceholderData } = useQuery(listQuery);
  const pageCount = Math.max(1, Math.ceil((data?.total ?? 0) / PAGE_SIZE));
  const filtered = hasFilters(search, isBoard);

  // Any change other than paging restarts at page 1; in-page changes keep the scroll position.
  const update = (changes: Partial<DashboardSearch>) =>
    navigate({
      replace: true,
      resetScroll: false,
      search: (previous) => ({ ...previous, page: undefined, ...changes }),
      viewTransition: false,
    });

  const clearFilters = () =>
    update({
      priority: undefined,
      q: undefined,
      sort: undefined,
      status: undefined,
      triage: undefined,
    });

  return (
    <main className="mx-auto flex w-full max-w-[1520px] flex-col gap-6 px-5 pt-6 pb-16 md:px-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-headline md:text-title">
            Your bug reports
          </h1>
          <p className="text-muted-foreground font-mono text-xs tabular-nums">
            {data
              ? `${data.total} ${data.total === 1 ? "report" : "reports"}`
              : " "}
          </p>
        </div>
        <ViewToggle
          onChange={(next) =>
            update({ view: next === "list" ? undefined : next })
          }
          value={view}
        />
      </header>

      <Toolbar search={search} sort={sort} update={update} view={view} />

      <div
        aria-busy={isPlaceholderData}
        className={cn(
          "ease-intent transition-opacity duration-300",
          isPlaceholderData && "opacity-60"
        )}
      >
        <Results
          data={data}
          filtered={filtered}
          isBoard={isBoard}
          isLoading={isLoading}
          listQueryKey={listQuery.queryKey}
          onClear={clearFilters}
        />
      </div>

      {isBoard && data ? (
        <BoardLimitNote shown={data.items.length} total={data.total} />
      ) : null}
      {!isBoard && data && (data.total > PAGE_SIZE || page > 1) ? (
        <Pagination
          onPage={(next) =>
            navigate({ search: (previous) => ({ ...previous, page: next }) })
          }
          page={page}
          pageCount={pageCount}
          total={data.total}
        />
      ) : null}
    </main>
  );
};
