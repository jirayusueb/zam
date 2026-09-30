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

export interface NetworkRequest {
  method: string;
  url: string;
  status: number;
  durationMs: number;
  timestamp: number;
}

export interface DevtoolsSnapshot {
  console: readonly ConsoleEntry[];
  network: readonly NetworkRequest[];
}

export const MAX_LOG_ENTRIES = 1000;
export const MAX_CONSOLE_MESSAGE_LENGTH = 2000;

const SECRET_PARAM_REGEX =
  /token|key|secret|password|passwd|auth|session|code|signature|sig/iu;

export const redactUrl = (url: string): string => {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return url;
  }
  for (const name of parsed.searchParams.keys()) {
    if (SECRET_PARAM_REGEX.test(name)) {
      parsed.searchParams.set(name, "[REDACTED]");
    }
  }
  return parsed.toString();
};

const MAX_HTTP_METHOD_LENGTH = 16;
const MAX_HTTP_STATUS = 599;

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
    holds: () => Number.isFinite(request.timestamp),
    violation: () =>
      invalidBugReport("Network request timestamp must be finite"),
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
