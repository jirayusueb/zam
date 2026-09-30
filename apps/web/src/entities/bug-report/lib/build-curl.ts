import type { NetworkRequest } from "@zam/capture/domain/value-objects/devtools-snapshot";
import {
  BINARY_BODY_NOTE,
  REDACTED,
} from "@zam/capture/domain/value-objects/devtools-snapshot";

/** Single-quotes a shell argument, escaping embedded single quotes (`'\''`). */
const shellQuote = (value: string): string =>
  `'${value.replaceAll("'", String.raw`'\''`)}'`;

/** Reproduces a captured request as a `curl` command; redacted headers/bodies are omitted, not leaked as `[REDACTED]`. */
export const buildCurl = (request: NetworkRequest): string => {
  const parts = [
    `curl ${shellQuote(request.url)}`,
    `-X ${shellQuote(request.method)}`,
  ];
  for (const [name, value] of Object.entries(request.requestHeaders ?? {})) {
    if (value === REDACTED) {
      continue;
    }
    parts.push(`-H ${shellQuote(`${name}: ${value}`)}`);
  }
  const body = request.requestBody;
  if (body && body !== REDACTED && body !== BINARY_BODY_NOTE) {
    parts.push(`--data-raw ${shellQuote(body)}`);
  }
  return parts.join(" ");
};
