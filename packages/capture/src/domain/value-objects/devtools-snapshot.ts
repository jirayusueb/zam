import { checkRules } from "../../shared/domain-rule";
import type { DomainRule } from "../../shared/domain-rule";
import { ok } from "../../shared/result";
import type { Result } from "../../shared/result";
import { invalidBugReport } from "../capture-domain-error";
import type { CaptureDomainError } from "../capture-domain-error";
import { MAX_URL_LENGTH } from "./page-url";

export const CONSOLE_LEVELS = [
  "log",
  "info",
  "warn",
  "error",
  "debug",
] as const;
export type ConsoleLevel = (typeof CONSOLE_LEVELS)[number];

export interface ConsoleEntry {
  level: ConsoleLevel;
  message: string;
  timestamp: number;
}

/**
 * `fetch`/`xhr` come from the fetch/XHR hooks; `websocket` is one entry per
 * connection (method `WS`, status 101 when opened, 0 when it failed); the rest
 * come from the browser's resource timing, where status 0 means "not exposed"
 * (cross-origin without Timing-Allow-Origin), not a failure.
 */
export const NETWORK_RESOURCE_TYPES = [
  "fetch",
  "xhr",
  "websocket",
  "script",
  "stylesheet",
  "image",
  "media",
  "font",
  "document",
  "manifest",
  "other",
] as const;
export type NetworkResourceType = (typeof NETWORK_RESOURCE_TYPES)[number];

/** Types whose status 0 means "unknown" rather than "failed". */
export const isResourceTimingType = (
  type: NetworkResourceType | undefined
): boolean =>
  type !== undefined &&
  type !== "fetch" &&
  type !== "xhr" &&
  type !== "websocket";

export interface NetworkRequest {
  /** Absent on reports captured before resource types existed: treat as `fetch`. */
  type?: NetworkResourceType;
  method: string;
  url: string;
  status: number;
  durationMs: number;
  timestamp: number;
  /** `null`/absent when not captured: old reports, or a non-text body (see `truncateNetworkBody`). */
  requestHeaders?: Record<string, string> | null;
  responseHeaders?: Record<string, string> | null;
  requestBody?: string | null;
  responseBody?: string | null;
}

export interface DevtoolsSnapshot {
  console: readonly ConsoleEntry[];
  network: readonly NetworkRequest[];
}

export const MAX_LOG_ENTRIES = 1000;
export const MAX_CONSOLE_MESSAGE_LENGTH = 2000;

const SECRET_NAME_REGEX =
  /token|key|secret|password|passwd|auth|session|code|signature|sig/iu;

export const REDACTED = "[REDACTED]";

/** Redaction policy shared by URL query params and application storage names. */
export const isSecretName = (name: string): boolean =>
  SECRET_NAME_REGEX.test(name);

export const redactUrl = (url: string): string => {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return url;
  }
  for (const name of parsed.searchParams.keys()) {
    if (isSecretName(name)) {
      parsed.searchParams.set(name, REDACTED);
    }
  }
  return parsed.toString();
};

export const MAX_NETWORK_HEADER_COUNT = 30;
export const MAX_NETWORK_HEADER_NAME_LENGTH = 100;
export const MAX_NETWORK_HEADER_VALUE_LENGTH = 500;
export const MAX_NETWORK_BODY_LENGTH = 2000;
export const NETWORK_BODY_TRUNCATION_MARKER = "…[truncated]";
export const BINARY_BODY_NOTE = "[binary]";

const SENSITIVE_HEADER_NAMES: Record<string, true> = {
  authorization: true,
  cookie: true,
  "proxy-authorization": true,
  "set-cookie": true,
  "x-api-key": true,
};

/** Redaction policy for network headers: named secrets plus anything matching `isSecretName`. */
export const isSecretHeaderName = (name: string): boolean =>
  SENSITIVE_HEADER_NAMES[name.toLowerCase()] === true || isSecretName(name);

/** Applied client-side before headers leave the browser, like `redactUrl`. */
export const redactNetworkHeaders = (
  headers: Record<string, string> | null | undefined
): Record<string, string> | null => {
  if (!headers) {
    return null;
  }
  return Object.fromEntries(
    Object.entries(headers)
      .slice(0, MAX_NETWORK_HEADER_COUNT)
      .map(([name, value]) => [
        name.slice(0, MAX_NETWORK_HEADER_NAME_LENGTH),
        isSecretHeaderName(name)
          ? REDACTED
          : value.slice(0, MAX_NETWORK_HEADER_VALUE_LENGTH),
      ])
  );
};

/** Applied client-side before bodies leave the browser, like `redactUrl`. */
export const truncateNetworkBody = (
  body: string | null | undefined
): string | null => {
  if (body === null || body === undefined) {
    return null;
  }
  return body.length > MAX_NETWORK_BODY_LENGTH
    ? body.slice(0, MAX_NETWORK_BODY_LENGTH) + NETWORK_BODY_TRUNCATION_MARKER
    : body;
};

/** Redacts headers and truncates bodies; applied client-side before a network request leaves the browser. */
export const redactNetworkRequestDetails = (
  request: NetworkRequest
): NetworkRequest => ({
  ...request,
  requestBody: truncateNetworkBody(request.requestBody),
  requestHeaders: redactNetworkHeaders(request.requestHeaders),
  responseBody: truncateNetworkBody(request.responseBody),
  responseHeaders: redactNetworkHeaders(request.responseHeaders),
});

const MAX_HTTP_METHOD_LENGTH = 16;
const MAX_HTTP_STATUS = 599;

const MAX_NETWORK_BODY_STORED_LENGTH =
  MAX_NETWORK_BODY_LENGTH + NETWORK_BODY_TRUNCATION_MARKER.length;

const fitsNetworkHeaderLimits = (
  headers: Record<string, string> | null | undefined
): boolean =>
  !headers ||
  (Object.keys(headers).length <= MAX_NETWORK_HEADER_COUNT &&
    Object.entries(headers).every(
      ([name, value]) =>
        name.length <= MAX_NETWORK_HEADER_NAME_LENGTH &&
        value.length <= MAX_NETWORK_HEADER_VALUE_LENGTH
    ));

const fitsNetworkBodyLimit = (body: string | null | undefined): boolean =>
  body === null ||
  body === undefined ||
  body.length <= MAX_NETWORK_BODY_STORED_LENGTH;

type DevtoolsRule = DomainRule<CaptureDomainError>;

const consoleEntryRules = (entry: ConsoleEntry): DevtoolsRule[] => [
  {
    holds: () => CONSOLE_LEVELS.includes(entry.level),
    violation: () => invalidBugReport(`Invalid console level: ${entry.level}`),
  },
  {
    holds: () => entry.message.length <= MAX_CONSOLE_MESSAGE_LENGTH,
    violation: () =>
      invalidBugReport(
        `Console message exceeds the maximum of ${MAX_CONSOLE_MESSAGE_LENGTH} characters`
      ),
  },
  {
    holds: () => Number.isFinite(entry.timestamp),
    violation: () => invalidBugReport("Console entry timestamp must be finite"),
  },
];

const networkRequestRules = (request: NetworkRequest): DevtoolsRule[] => [
  {
    holds: () =>
      request.method.length >= 1 &&
      request.method.length <= MAX_HTTP_METHOD_LENGTH,
    violation: () =>
      invalidBugReport(
        `Network method must be 1-${MAX_HTTP_METHOD_LENGTH} characters: ${request.method}`
      ),
  },
  {
    holds: () => request.url.length <= MAX_URL_LENGTH,
    violation: () =>
      invalidBugReport(
        `Network url exceeds the maximum of ${MAX_URL_LENGTH} characters`
      ),
  },
  {
    holds: () =>
      Number.isInteger(request.status) &&
      request.status >= 0 &&
      request.status <= MAX_HTTP_STATUS,
    violation: () =>
      invalidBugReport(
        `Network status must be an integer in 0..${MAX_HTTP_STATUS}: ${request.status}`
      ),
  },
  {
    holds: () => request.durationMs >= 0,
    violation: () => invalidBugReport("Network durationMs must be >= 0"),
  },
  {
    holds: () =>
      request.type === undefined ||
      NETWORK_RESOURCE_TYPES.includes(request.type),
    violation: () =>
      invalidBugReport(`Invalid network resource type: ${request.type}`),
  },
  {
    holds: () => Number.isFinite(request.timestamp),
    violation: () =>
      invalidBugReport("Network request timestamp must be finite"),
  },
  {
    holds: () =>
      fitsNetworkHeaderLimits(request.requestHeaders) &&
      fitsNetworkHeaderLimits(request.responseHeaders),
    violation: () =>
      invalidBugReport(
        `Network headers exceed ${MAX_NETWORK_HEADER_COUNT} entries or the ${MAX_NETWORK_HEADER_NAME_LENGTH}/${MAX_NETWORK_HEADER_VALUE_LENGTH} character name/value limits`
      ),
  },
  {
    holds: () =>
      fitsNetworkBodyLimit(request.requestBody) &&
      fitsNetworkBodyLimit(request.responseBody),
    violation: () =>
      invalidBugReport(
        `Network body exceeds the maximum of ${MAX_NETWORK_BODY_LENGTH} characters`
      ),
  },
];

export const parseDevtoolsSnapshot = (
  devtools: DevtoolsSnapshot
): Result<DevtoolsSnapshot, CaptureDomainError> => {
  const sizes = checkRules(
    {
      holds: () => devtools.console.length <= MAX_LOG_ENTRIES,
      violation: () =>
        invalidBugReport(
          `Console entries exceed the maximum of ${MAX_LOG_ENTRIES}`
        ),
    },
    {
      holds: () => devtools.network.length <= MAX_LOG_ENTRIES,
      violation: () =>
        invalidBugReport(
          `Network requests exceed the maximum of ${MAX_LOG_ENTRIES}`
        ),
    }
  );
  if (!sizes.ok) {
    return sizes;
  }
  for (const entry of devtools.console) {
    const checked = checkRules(...consoleEntryRules(entry));
    if (!checked.ok) {
      return checked;
    }
  }
  for (const request of devtools.network) {
    const checked = checkRules(...networkRequestRules(request));
    if (!checked.ok) {
      return checked;
    }
  }
  return ok(devtools);
};
