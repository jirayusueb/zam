import { useQuery } from "@tanstack/react-query";
import { useNavigate, useSearch } from "@tanstack/react-router";
import type { BugReportSummary } from "@zam/capture/application/ports/bug-report-read-model";
import { MAX_SEARCH_QUERY_LENGTH } from "@zam/capture/application/queries/list-my-bug-reports";
import type { BugReportSort } from "@zam/capture/application/query-specifications/bug-report-query";
import { Button } from "@zam/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@zam/ui/components/card";
import { Empty, EmptyDescription, EmptyTitle } from "@zam/ui/components/empty";
import { Input } from "@zam/ui/components/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@zam/ui/components/native-select";
import { Skeleton } from "@zam/ui/components/skeleton";
import { useState } from "react";

import { BugReportsTable, myBugReportsQuery } from "@/entities/bug-report";

const SKELETON_ROWS = 3;
const PAGE_SIZE = 20;

const SORT_LABELS: Record<BugReportSort, string> = {
  newest: "Newest first",
  oldest: "Oldest first",
  relevance: "Best match",
  title: "Title A–Z",
};

const DashboardBody = ({
  isFiltered,
  isLoading,
  reports,
}: {
  isFiltered: boolean;
  isLoading: boolean;
  reports: BugReportSummary[] | undefined;
}) => {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: SKELETON_ROWS }, (_, index) => (
          <Skeleton className="h-10 w-full" key={index} />
        ))}
      </div>
    );
  }

  if (reports && reports.length > 0) {
    return <BugReportsTable reports={reports} />;
  }

  return isFiltered ? (
    <Empty>
      <EmptyTitle>No matching bug reports</EmptyTitle>
      <EmptyDescription>Try other words or clear the filters.</EmptyDescription>
    </Empty>
  ) : (
    <Empty>
      <EmptyTitle>No bug reports yet</EmptyTitle>
      <EmptyDescription>
        Install the Zam extension, sign in, and start a recording.
      </EmptyDescription>
    </Empty>
  );
};

/** Keyed by the URL query so back/forward resets the draft text. */
const SearchForm = ({
  initialQuery,
  onSearch,
}: {
  initialQuery: string;
  onSearch: (query: string) => void;
}) => {
  const [query, setQuery] = useState(initialQuery);
  return (
    <search className="flex min-w-48 flex-1">
      <form
        className="flex flex-1 gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          onSearch(query.trim());
        }}
      >
        <Input
          aria-label="Search bug reports"
          maxLength={MAX_SEARCH_QUERY_LENGTH}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search titles and page URLs"
          type="search"
          value={query}
        />
        <Button type="submit" variant="outline">
          Search
        </Button>
      </form>
    </search>
  );
};

export const DashboardPage = () => {
  const search = useSearch({ from: "/_private/dashboard" });
  const navigate = useNavigate({ from: "/dashboard" });
  const page = search.page ?? 1;
  const sort = search.sort ?? (search.q ? "relevance" : "newest");
  const { data, isLoading, isPlaceholderData } = useQuery(
    myBugReportsQuery({
      page,
      pageSize: PAGE_SIZE,
      query: search.q,
      sort,
      status: search.status,
    })
  );
  const pageCount = Math.max(1, Math.ceil((data?.total ?? 0) / PAGE_SIZE));

  // Any change other than paging restarts at page 1.
  const update = (changes: Partial<typeof search>) =>
    navigate({
      search: (previous) => ({ ...previous, page: undefined, ...changes }),
    });

  return (
    <div className="container mx-auto max-w-4xl px-4 py-6">
      <Card>
        <CardHeader>
          <CardTitle>Your bug reports</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <SearchForm
              initialQuery={search.q ?? ""}
              key={search.q}
              onSearch={(query) =>
                update({ q: query || undefined, sort: undefined })
              }
            />
            <NativeSelect
              aria-label="Filter by status"
              onChange={(event) =>
                update({
                  status: (event.target.value || undefined) as
                    | BugReportSummary["status"]
                    | undefined,
                })
              }
              value={search.status ?? ""}
            >
              <NativeSelectOption value="">All statuses</NativeSelectOption>
              <NativeSelectOption value="published">
                Published
              </NativeSelectOption>
              <NativeSelectOption value="draft">Draft</NativeSelectOption>
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
          <div
            aria-busy={isPlaceholderData}
            className={isPlaceholderData ? "opacity-60" : undefined}
          >
            <DashboardBody
              isFiltered={Boolean(search.q || search.status)}
              isLoading={isLoading}
              reports={data?.items}
            />
          </div>
          {data && (data.total > PAGE_SIZE || page > 1) && (
            <nav
              aria-label="Pagination"
              className="flex items-center justify-between gap-2 text-sm"
            >
              <Button
                disabled={page <= 1}
                onClick={() =>
                  navigate({
                    search: (previous) => ({ ...previous, page: page - 1 }),
                  })
                }
                variant="outline"
              >
                Previous
              </Button>
              <span className="text-muted-foreground">
                Page {page} of {pageCount} · {data.total} reports
              </span>
              <Button
                disabled={page >= pageCount}
                onClick={() =>
                  navigate({
                    search: (previous) => ({ ...previous, page: page + 1 }),
                  })
                }
                variant="outline"
              >
                Next
              </Button>
            </nav>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
