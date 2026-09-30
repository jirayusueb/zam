import { REDACTED } from "@zam/capture/domain/value-objects/devtools-snapshot";
import type {
  CookieSameSite,
  StorageItem,
  StorageSnapshot,
  StoredCookie,
} from "@zam/capture/domain/value-objects/storage-snapshot";
import { Empty, EmptyDescription, EmptyTitle } from "@zam/ui/components/empty";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@zam/ui/components/tabs";
import { useState } from "react";
import type { ReactNode } from "react";

const EXPIRES_FORMAT = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

const SAME_SITE_LABEL: Record<CookieSameSite, string> = {
  lax: "Lax",
  none: "None",
  strict: "Strict",
  unspecified: "",
};

const COOKIE_COLUMNS =
  "grid min-w-[57rem] grid-cols-[minmax(8rem,1fr)_minmax(10rem,2fr)_10rem_5rem_10rem_4.5rem_4.5rem_5rem] items-center";
const ITEM_COLUMNS =
  "grid grid-cols-[minmax(8rem,1fr)_minmax(10rem,2fr)] items-center";

/** Pretty-prints JSON values (the common case for web storage); anything else verbatim. */
const formatValue = (value: string): string => {
  try {
    const parsed: unknown = JSON.parse(value);
    return typeof parsed === "object" && parsed !== null
      ? JSON.stringify(parsed, null, 2)
      : value;
  } catch {
    return value;
  }
};

const ValueText = ({ value }: { value: string }) =>
  value === REDACTED ? (
    <span className="text-muted-foreground italic">redacted</span>
  ) : (
    value
  );

const Cell = ({ children }: { children: ReactNode }) => (
  <span className="truncate px-2">{children}</span>
);

interface Row {
  id: string;
  value: string;
  cells: ReactNode[];
}

const StorageTable = ({
  columns,
  emptyTitle,
  headers,
  rows,
}: {
  columns: string;
  emptyTitle: string;
  headers: string[];
  rows: Row[];
}) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = rows.find((row) => row.id === selectedId);

  if (rows.length === 0) {
    return (
      <Empty>
        <EmptyTitle>{emptyTitle}</EmptyTitle>
        <EmptyDescription>
          Nothing was stored for this page when the recording stopped.
        </EmptyDescription>
      </Empty>
    );
  }

  return (
    <div className="flex h-full min-w-0 flex-col">
      <div className="min-h-0 flex-1 overflow-auto">
        <div
          className={`${columns} bg-background sticky top-0 h-10 border-b text-sm font-medium`}
        >
          {headers.map((header) => (
            <span className="px-2" key={header}>
              {header}
            </span>
          ))}
        </div>
        {rows.map((row) => (
          <button
            aria-pressed={row.id === selectedId}
            className={`${columns} hover:bg-muted/50 aria-pressed:bg-muted h-9 w-full border-b text-left font-mono text-xs`}
            key={row.id}
            onClick={() => setSelectedId(row.id)}
            type="button"
          >
            {row.cells.map((cell, index) => (
              <Cell key={headers[index]}>{cell}</Cell>
            ))}
          </button>
        ))}
      </div>
      <pre className="bg-muted/40 h-32 shrink-0 overflow-auto border-t p-3 font-mono text-xs break-all whitespace-pre-wrap">
        {selected ? (
          <ValueText value={formatValue(selected.value)} />
        ) : (
          <span className="text-muted-foreground">
            Select a row to see its full value.
          </span>
        )}
      </pre>
    </div>
  );
};

const cookieRows = (cookies: readonly StoredCookie[]): Row[] =>
  cookies.map((cookie) => ({
    cells: [
      cookie.name,
      <ValueText key="value" value={cookie.value} />,
      cookie.domain,
      cookie.path,
      cookie.expiresAt === null
        ? "Session"
        : EXPIRES_FORMAT.format(cookie.expiresAt),
      cookie.httpOnly ? "✓" : "",
      cookie.secure ? "✓" : "",
      SAME_SITE_LABEL[cookie.sameSite],
    ],
    id: `${cookie.domain}|${cookie.path}|${cookie.name}`,
    value: cookie.value,
  }));

const itemRows = (items: readonly StorageItem[]): Row[] =>
  items.map((item) => ({
    cells: [item.key, <ValueText key="value" value={item.value} />],
    id: item.key,
    value: item.value,
  }));

const ITEM_HEADERS = ["Key", "Value"];

/** Chrome DevTools-style Application panel: storage of the page when the recording stopped. */
export const ApplicationStorage = ({
  storage,
}: {
  storage: StorageSnapshot;
}) => (
  <Tabs
    className="h-full min-w-0 flex-col md:flex-row"
    defaultValue="cookies"
    orientation="vertical"
  >
    <TabsList className="shrink-0" variant="line">
      <TabsTrigger value="cookies">
        Cookies ({storage.cookies.length})
      </TabsTrigger>
      <TabsTrigger value="localStorage">
        Local storage ({storage.localStorage.length})
      </TabsTrigger>
      <TabsTrigger value="sessionStorage">
        Session storage ({storage.sessionStorage.length})
      </TabsTrigger>
    </TabsList>
    <TabsContent className="min-h-0 min-w-0" value="cookies">
      <StorageTable
        columns={COOKIE_COLUMNS}
        emptyTitle="No cookies"
        headers={[
          "Name",
          "Value",
          "Domain",
          "Path",
          "Expires",
          "HttpOnly",
          "Secure",
          "SameSite",
        ]}
        rows={cookieRows(storage.cookies)}
      />
    </TabsContent>
    <TabsContent className="min-h-0 min-w-0" value="localStorage">
      <StorageTable
        columns={ITEM_COLUMNS}
        emptyTitle="No local storage"
        headers={ITEM_HEADERS}
        rows={itemRows(storage.localStorage)}
      />
    </TabsContent>
    <TabsContent className="min-h-0 min-w-0" value="sessionStorage">
      <StorageTable
        columns={ITEM_COLUMNS}
        emptyTitle="No session storage"
        headers={ITEM_HEADERS}
        rows={itemRows(storage.sessionStorage)}
      />
    </TabsContent>
  </Tabs>
);
