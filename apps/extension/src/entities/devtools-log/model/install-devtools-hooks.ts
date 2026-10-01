import type {
  ConsoleEntry,
  ConsoleLevel,
  NetworkRequest,
  NetworkResourceType,
} from "@zam/capture/domain/value-objects/devtools-snapshot";
import {
  MAX_CONSOLE_MESSAGE_LENGTH,
  MAX_LOG_ENTRIES,
  redactNetworkRequestDetails,
  redactUrl,
  truncateNetworkBody,
} from "@zam/capture/domain/value-objects/devtools-snapshot";
import { MAX_URL_LENGTH } from "@zam/capture/domain/value-objects/page-url";
import {
  MAX_METADATA_ENTRIES,
  MAX_METADATA_KEY_LENGTH,
  MAX_METADATA_VALUE_LENGTH,
} from "@zam/capture/domain/value-objects/report-metadata";
import type { UserStep } from "@zam/capture/domain/value-objects/user-step";

import { installStepHooks } from "./install-step-hooks";

export const DEVTOOLS_BUFFER_KEY = "zam.devtools";

interface DevtoolsBuffer {
  console: ConsoleEntry[];
  network: NetworkRequest[];
  // ponytail: resource-timing entries (images, scripts, stylesheets, fonts…)
  // are kept in their own bounded list so a flood of static assets can't
  // evict already-captured fetch/xhr/websocket entries; the two lists are
  // merged when the buffer is read (see collect-devtools.ts).
  resourceNetwork: NetworkRequest[];
  steps: UserStep[];
  metadata: Record<string, string>;
}

const formatArg = (arg: unknown): string => {
  if (typeof arg === "string") {
    return arg;
  }
  if (arg instanceof Error) {
    return `${arg.name}: ${arg.message}\n${arg.stack ?? ""}`;
  }
  try {
    return JSON.stringify(arg);
  } catch {
    return String(arg);
  }
};

const pushBounded = <T>(list: T[], entry: T): void => {
  list.push(entry);
  if (list.length > MAX_LOG_ENTRIES) {
    list.shift();
  }
};

const installConsoleHooks = (buffer: DevtoolsBuffer): void => {
  const levels: ConsoleLevel[] = ["log", "info", "warn", "error", "debug"];
  for (const level of levels) {
    const original = console[level].bind(console);
    console[level] = (...args: unknown[]) => {
      const message = args
        .map(formatArg)
        .join(" ")
        .slice(0, MAX_CONSOLE_MESSAGE_LENGTH);
      pushBounded(buffer.console, { level, message, timestamp: Date.now() });
      original(...args);
    };
  }
};

const installErrorHooks = (buffer: DevtoolsBuffer): void => {
  window.addEventListener("error", (event) => {
    const message = `${event.message} (${event.filename}:${event.lineno}:${event.colno})`;
    pushBounded(buffer.console, {
      level: "error",
      message: message.slice(0, MAX_CONSOLE_MESSAGE_LENGTH),
      timestamp: Date.now(),
    });
  });
  window.addEventListener("unhandledrejection", (event) => {
    const message = `Unhandled rejection: ${formatArg(event.reason)}`;
    pushBounded(buffer.console, {
      level: "error",
      message: message.slice(0, MAX_CONSOLE_MESSAGE_LENGTH),
      timestamp: Date.now(),
    });
  });
};

const resolveUrl = (input: string): string => {
  const absolute = new URL(input, location.href).href;
  return redactUrl(absolute).slice(0, MAX_URL_LENGTH);
};

type NetworkBodyInit = BodyInit | Document;

const BINARY_BODY_NOTE = "[binary]";
const TEXT_BODY_CONTENT_TYPE_REGEX =
  /^(?:text\/|application\/(?:json|xml|x-www-form-urlencoded|javascript)|[^;]+\+(?:json|xml))/iu;

// ponytail: content-type sniffing only; a text body served with the wrong
// (or no) content-type header reads back as "[binary]" instead of its text.
const isTextContentType = (contentType: string | null): boolean =>
  contentType !== null && TEXT_BODY_CONTENT_TYPE_REGEX.test(contentType);

const headersToRecord = (
  headers: HeadersInit | Headers | undefined
): Record<string, string> | null => {
  if (!headers) {
    return null;
  }
  let entries: [string, string][];
  if (headers instanceof Headers) {
    entries = [...headers.entries()];
  } else if (Array.isArray(headers)) {
    entries = headers;
  } else {
    entries = Object.entries(headers);
  }
  return entries.length > 0 ? Object.fromEntries(entries) : null;
};

const requestBodyOf = (body: NetworkBodyInit): string | null => {
  if (typeof body === "string") {
    return body;
  }
  if (body instanceof URLSearchParams) {
    return body.toString();
  }
  return BINARY_BODY_NOTE;
};

/** Reads a cloned Request/Response body without disturbing the original. */
const readBodyText = async (
  source: { clone: () => { text: () => Promise<string> } },
  contentType: string | null
): Promise<string | null> => {
  if (!isTextContentType(contentType)) {
    return BINARY_BODY_NOTE;
  }
  try {
    return await source.clone().text();
  } catch {
    return null;
  }
};

const applyBodyText = async (
  entry: NetworkRequest,
  field: "requestBody" | "responseBody",
  source: { clone: () => { text: () => Promise<string> } },
  contentType: string | null
): Promise<void> => {
  const text = await readBodyText(source, contentType);
  entry[field] = truncateNetworkBody(text);
};

const installFetchHook = (buffer: DevtoolsBuffer): void => {
  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const requestObject = input instanceof Request ? input : null;
    const method = (
      init?.method ??
      requestObject?.method ??
      "GET"
    ).toUpperCase();
    const url = resolveUrl(requestObject ? requestObject.url : String(input));
    const requestHeaders = headersToRecord(
      init?.headers ?? requestObject?.headers
    );
    const requestBodyInit =
      init?.body === undefined || init.body === null
        ? null
        : requestBodyOf(init.body);
    const startedAt = Date.now();
    try {
      const response = await originalFetch(input, init);
      const entry = redactNetworkRequestDetails({
        durationMs: Date.now() - startedAt,
        method,
        requestBody: requestBodyInit,
        requestHeaders,
        responseBody: null,
        responseHeaders: headersToRecord(response.headers),
        status: response.status,
        timestamp: startedAt,
        type: "fetch",
        url,
      });
      pushBounded(buffer.network, entry);
      // Bodies are read from clones after the entry is already pushed, so the
      // caller's response still resolves at header time, exactly as an
      // unhooked fetch would.
      if (requestBodyInit === null && requestObject) {
        void applyBodyText(
          entry,
          "requestBody",
          requestObject,
          requestObject.headers.get("content-type")
        );
      }
      void applyBodyText(
        entry,
        "responseBody",
        response,
        response.headers.get("content-type")
      );
      return response;
    } catch (error) {
      pushBounded(
        buffer.network,
        redactNetworkRequestDetails({
          durationMs: Date.now() - startedAt,
          method,
          requestBody: requestBodyInit,
          requestHeaders,
          responseBody: null,
          responseHeaders: null,
          status: 0,
          timestamp: startedAt,
          type: "fetch",
          url,
        })
      );
      throw error;
    }
  };
};

const xhrRequests = new WeakMap<
  XMLHttpRequest,
  {
    method: string;
    url: string;
    startedAt: number;
    headers: Record<string, string>;
  }
>();

const parseHeaderString = (raw: string): Record<string, string> | null => {
  const entries: [string, string][] = [];
  for (const line of raw.trim().split(/\r?\n/u)) {
    const separatorIndex = line.indexOf(":");
    if (separatorIndex === -1) {
      continue;
    }
    entries.push([
      line.slice(0, separatorIndex).trim(),
      line.slice(separatorIndex + 1).trim(),
    ]);
  }
  return entries.length > 0 ? Object.fromEntries(entries) : null;
};

// responseText throws for responseType values other than "" | "text"; "json"
// is re-stringified from the already-parsed `response` instead.
const readXhrResponseBody = (xhr: XMLHttpRequest): string | null => {
  if (xhr.responseType === "" || xhr.responseType === "text") {
    return xhr.responseText;
  }
  if (xhr.responseType === "json") {
    if (xhr.response === null || xhr.response === undefined) {
      return null;
    }
    try {
      return JSON.stringify(xhr.response);
    } catch {
      return null;
    }
  }
  return BINARY_BODY_NOTE;
};

const installXhrHook = (buffer: DevtoolsBuffer): void => {
  const originalOpen = XMLHttpRequest.prototype.open;
  // Overriding a native method's signature is inherently unsafe; open still forwards every argument unchanged.
  const patchedOpen = function patchedOpen(
    this: XMLHttpRequest,
    method: string,
    url: string | URL,
    ...rest: unknown[]
  ) {
    xhrRequests.set(this, {
      headers: {},
      method: method.toUpperCase(),
      startedAt: Date.now(),
      url: resolveUrl(String(url)),
    });
    return originalOpen.apply(this, [
      method,
      url,
      ...rest,
    ] as unknown as Parameters<typeof originalOpen>);
  } as typeof originalOpen;
  XMLHttpRequest.prototype.open = patchedOpen;

  const originalSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;
  const patchedSetRequestHeader = function patchedSetRequestHeader(
    this: XMLHttpRequest,
    name: string,
    value: string
  ) {
    const request = xhrRequests.get(this);
    if (request) {
      request.headers[name] = value;
    }
    return originalSetRequestHeader.call(this, name, value);
  } as typeof originalSetRequestHeader;
  XMLHttpRequest.prototype.setRequestHeader = patchedSetRequestHeader;

  const originalSend = XMLHttpRequest.prototype.send;
  const patchedSend = function patchedSend(
    this: XMLHttpRequest,
    ...args: unknown[]
  ) {
    const [body] = args as [NetworkBodyInit | null | undefined];
    const requestBody =
      body === undefined || body === null ? null : requestBodyOf(body);
    this.addEventListener("loadend", () => {
      const request = xhrRequests.get(this);
      if (!request) {
        return;
      }
      pushBounded(
        buffer.network,
        redactNetworkRequestDetails({
          durationMs: Date.now() - request.startedAt,
          method: request.method,
          requestBody,
          requestHeaders:
            Object.keys(request.headers).length > 0 ? request.headers : null,
          responseBody: readXhrResponseBody(this),
          responseHeaders: parseHeaderString(this.getAllResponseHeaders()),
          status: this.status,
          timestamp: request.startedAt,
          type: "xhr",
          url: request.url,
        })
      );
    });
    return originalSend.apply(
      this,
      args as unknown as Parameters<typeof originalSend>
    );
  } as typeof originalSend;
  XMLHttpRequest.prototype.send = patchedSend;
};

/** Wraps `window.WebSocket`; preserves prototype/statics so `instanceof` and `WebSocket.OPEN` keep working on the real socket the native constructor returns. */
const installWebSocketHook = (buffer: DevtoolsBuffer): void => {
  const OriginalWebSocket = window.WebSocket;

  const PatchedWebSocket = function PatchedWebSocket(
    url: string | URL,
    protocols?: string | string[]
  ) {
    const redactedUrl = resolveUrl(String(url));
    const socket =
      protocols === undefined
        ? new OriginalWebSocket(url)
        : new OriginalWebSocket(url, protocols);
    let entry: NetworkRequest | null = null;
    socket.addEventListener("open", () => {
      entry = {
        durationMs: 0,
        method: "WS",
        status: 101,
        timestamp: Date.now(),
        type: "websocket",
        url: redactedUrl,
      };
      pushBounded(buffer.network, entry);
    });
    socket.addEventListener("error", () => {
      if (!entry) {
        entry = {
          durationMs: 0,
          method: "WS",
          status: 0,
          timestamp: Date.now(),
          type: "websocket",
          url: redactedUrl,
        };
        pushBounded(buffer.network, entry);
      }
    });
    socket.addEventListener("close", () => {
      if (entry) {
        entry.durationMs = Date.now() - entry.timestamp;
      }
    });
    return socket;
  };
  PatchedWebSocket.prototype = OriginalWebSocket.prototype;
  Object.setPrototypeOf(PatchedWebSocket, OriginalWebSocket);
  window.WebSocket = PatchedWebSocket as unknown as typeof WebSocket;
};

const FONT_URL_EXT_REGEX = /\.(?:woff2?|ttf|otf)(?:[?#]|$)/iu;
const MANIFEST_URL_EXT_REGEX = /\.webmanifest(?:[?#]|$)/iu;
// fetch/xhr are already captured by their own hooks above.
const RESOURCE_TIMING_SKIP_INITIATOR_TYPES: Record<string, true> = {
  beacon: true,
  fetch: true,
  xmlhttprequest: true,
};

const resourceTypeOf = (
  initiatorType: string,
  url: string
): NetworkResourceType => {
  if (FONT_URL_EXT_REGEX.test(url)) {
    return "font";
  }
  if (MANIFEST_URL_EXT_REGEX.test(url)) {
    return "manifest";
  }
  switch (initiatorType) {
    case "script": {
      return "script";
    }
    case "link":
    case "css": {
      return "stylesheet";
    }
    case "img":
    case "image":
    case "css-image": {
      return "image";
    }
    case "video":
    case "audio": {
      return "media";
    }
    case "iframe":
    case "navigation": {
      return "document";
    }
    default: {
      return "other";
    }
  }
};

const pushResourceTimingEntry = (
  buffer: DevtoolsBuffer,
  initiatorType: string,
  name: string,
  startTime: number,
  duration: number,
  responseStatus: number | undefined
): void => {
  if (RESOURCE_TIMING_SKIP_INITIATOR_TYPES[initiatorType]) {
    return;
  }
  const url = resolveUrl(name);
  pushBounded(buffer.resourceNetwork, {
    durationMs: Math.round(duration),
    method: "GET",
    status: responseStatus ?? 0,
    timestamp: Math.round(performance.timeOrigin + startTime),
    type: resourceTypeOf(initiatorType, url),
    url,
  });
};

/** Static assets (scripts, stylesheets, images, fonts…) via the Resource Timing API; fetch/xhr/websocket are covered by their own hooks. */
const installResourceTimingHook = (buffer: DevtoolsBuffer): void => {
  const observer = new PerformanceObserver((list) => {
    for (const resourceEntry of list.getEntries() as PerformanceResourceTiming[]) {
      pushResourceTimingEntry(
        buffer,
        resourceEntry.initiatorType,
        resourceEntry.name,
        resourceEntry.startTime,
        resourceEntry.duration,
        (
          resourceEntry as PerformanceResourceTiming & {
            responseStatus?: number;
          }
        ).responseStatus
      );
    }
  });
  observer.observe({ buffered: true, type: "resource" });

  // Not covered by the "resource" observer above; pushed once for the
  // document's single navigation entry.
  const [navigationEntry] = performance.getEntriesByType(
    "navigation"
  ) as PerformanceNavigationTiming[];
  if (navigationEntry) {
    pushResourceTimingEntry(
      buffer,
      "navigation",
      navigationEntry.name,
      navigationEntry.startTime,
      navigationEntry.duration,
      (
        navigationEntry as PerformanceNavigationTiming & {
          responseStatus?: number;
        }
      ).responseStatus
    );
  }
};

/** `window.zam.setMetadata` (MAIN world, non-enumerable): shallow-merges custom key/value context set by the page. */
const installMetadataHook = (buffer: DevtoolsBuffer): void => {
  const setMetadata = (input: unknown): void => {
    if (typeof input !== "object" || input === null) {
      return;
    }
    for (const [key, value] of Object.entries(input)) {
      const isNewKey = !(key in buffer.metadata);
      if (
        isNewKey &&
        Object.keys(buffer.metadata).length >= MAX_METADATA_ENTRIES
      ) {
        continue;
      }
      if (key.length < 1 || key.length > MAX_METADATA_KEY_LENGTH) {
        continue;
      }
      const stringValue = typeof value === "string" ? value : String(value);
      buffer.metadata[key] = stringValue.slice(0, MAX_METADATA_VALUE_LENGTH);
    }
  };
  Object.defineProperty(window, "zam", {
    configurable: false,
    enumerable: false,
    value: Object.freeze({ setMetadata }),
    writable: false,
  });
};

export const installDevtoolsHooks = (): void => {
  const key = Symbol.for(DEVTOOLS_BUFFER_KEY);
  const globalWithBuffer = globalThis as Record<
    symbol,
    DevtoolsBuffer | undefined
  >;
  if (globalWithBuffer[key]) {
    return;
  }
  const buffer: DevtoolsBuffer = {
    console: [],
    metadata: {},
    network: [],
    resourceNetwork: [],
    steps: [],
  };
  Object.defineProperty(globalThis, key, {
    configurable: false,
    enumerable: false,
    value: buffer,
    writable: false,
  });
  installConsoleHooks(buffer);
  installErrorHooks(buffer);
  installFetchHook(buffer);
  installXhrHook(buffer);
  installWebSocketHook(buffer);
  installResourceTimingHook(buffer);
  installMetadataHook(buffer);
  installStepHooks(buffer.steps);
};
