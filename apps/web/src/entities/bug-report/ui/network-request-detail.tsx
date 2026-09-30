import { useClipboard } from "@shined/react-use";
import type { NetworkRequest } from "@zam/capture/domain/value-objects/devtools-snapshot";
import { Button } from "@zam/ui/components/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@zam/ui/components/tabs";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { toast } from "sonner";

import { buildCurl } from "../lib/build-curl";
import { formatOffset } from "../lib/format-offset";
import { isErrorStatus, statusLabel } from "../lib/network-request-format";
import { JsonValue } from "./json-value";

const FieldEmpty = ({ label }: { label: string }) => (
  <p className="text-muted-foreground text-sm italic">
    Not captured for this request: {label}.
  </p>
);

const Field = ({ label, value }: { label: string; value: ReactNode }) => (
  <div className="flex gap-2 py-1">
    <dt className="text-muted-foreground shrink-0">{label}:</dt>
    <dd className="break-all">{value}</dd>
  </div>
);

const HeaderList = ({
  emptyLabel,
  headers,
}: {
  emptyLabel: string;
  headers: Record<string, string> | null | undefined;
}) => {
  const entries = headers ? Object.entries(headers) : [];
  if (entries.length === 0) {
    return <FieldEmpty label={emptyLabel} />;
  }
  return (
    <dl className="divide-border divide-y font-mono text-xs">
      {entries.map(([name, value]) => (
        <Field key={name} label={name} value={value} />
      ))}
    </dl>
  );
};

const BodyView = ({
  body,
  emptyLabel,
}: {
  body: string | null | undefined;
  emptyLabel: string;
}) => (body ? <JsonValue value={body} /> : <FieldEmpty label={emptyLabel} />);

const queryParamsOf = (url: string): [string, string][] => {
  try {
    return [...new URL(url).searchParams.entries()];
  } catch {
    return [];
  }
};

const QueryParams = ({ url }: { url: string }) => {
  const params = queryParamsOf(url);
  if (params.length === 0) {
    return (
      <p className="text-muted-foreground text-sm italic">
        The URL has no query parameters.
      </p>
    );
  }
  return (
    <dl className="divide-border divide-y font-mono text-xs">
      {params.map(([name, value], index) => (
        <Field key={`${name}-${index}`} label={name} value={value} />
      ))}
    </dl>
  );
};

const Section = ({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) => (
  <div>
    <h3 className="mb-1.5 text-xs font-medium tracking-wide uppercase">
      {title}
    </h3>
    {children}
  </div>
);

// useClipboard falls back to execCommand where the Clipboard API is missing; `copied` resets after 1.5s.
const CopyCurlButton = ({ request }: { request: NetworkRequest }) => {
  const { copied, copy } = useClipboard();

  const copyCurl = async () => {
    try {
      await copy(buildCurl(request));
      toast.success("cURL command copied");
    } catch {
      toast.error("Couldn't copy the command.");
    }
  };

  return (
    <Button onClick={copyCurl} size="sm" type="button" variant="outline">
      {copied ? "Copied" : "Copy as cURL"}
    </Button>
  );
};

/** Chrome DevTools-style request detail: Headers, Payload and Response tabs, inline next to the list on wide screens. */
export const NetworkRequestDetail = ({
  onClose,
  request,
  startedAtMs,
}: {
  onClose: () => void;
  request: NetworkRequest;
  startedAtMs: number;
}) => (
  <div className="flex min-h-0 flex-1 flex-col overflow-hidden border-l">
    <div className="flex items-center justify-between gap-2 border-b p-2">
      <p className="min-w-0 truncate font-mono text-sm" title={request.url}>
        {request.method} {request.url}
      </p>
      <div className="flex shrink-0 items-center gap-1">
        <CopyCurlButton request={request} />
        <Button
          aria-label="Close request details"
          onClick={onClose}
          size="icon-sm"
          type="button"
          variant="ghost"
        >
          <X aria-hidden />
        </Button>
      </div>
    </div>
    <Tabs className="min-h-0 flex-1" defaultValue="headers">
      <TabsList className="mx-4 mt-2 w-fit">
        <TabsTrigger value="headers">Headers</TabsTrigger>
        <TabsTrigger value="payload">Payload</TabsTrigger>
        <TabsTrigger value="response">Response</TabsTrigger>
      </TabsList>
      <TabsContent className="space-y-4 overflow-auto p-4" value="headers">
        <Section title="General">
          <dl className="divide-border divide-y font-mono text-xs">
            <Field label="Request URL" value={request.url} />
            <Field label="Method" value={request.method} />
            <Field
              label="Status"
              value={
                <span
                  className={
                    isErrorStatus(request.status)
                      ? "text-destructive"
                      : undefined
                  }
                >
                  {statusLabel(request.status)}
                </span>
              }
            />
            <Field label="Duration" value={`${request.durationMs} ms`} />
            <Field
              label="Time"
              value={formatOffset(request.timestamp - startedAtMs)}
            />
          </dl>
        </Section>
        <Section title="Request headers">
          <HeaderList
            emptyLabel="request headers"
            headers={request.requestHeaders}
          />
        </Section>
        <Section title="Response headers">
          <HeaderList
            emptyLabel="response headers"
            headers={request.responseHeaders}
          />
        </Section>
      </TabsContent>
      <TabsContent className="space-y-4 overflow-auto p-4" value="payload">
        <Section title="Query parameters">
          <QueryParams url={request.url} />
        </Section>
        <Section title="Request body">
          <BodyView body={request.requestBody} emptyLabel="request body" />
        </Section>
      </TabsContent>
      <TabsContent className="overflow-auto p-4" value="response">
        <BodyView body={request.responseBody} emptyLabel="response body" />
      </TabsContent>
    </Tabs>
  </div>
);
