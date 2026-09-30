import type {
  ConsoleEntry,
  ConsoleLevel,
  NetworkRequest,
} from "@zam/capture/domain/value-objects/devtools-snapshot";
import {
  MAX_CONSOLE_MESSAGE_LENGTH,
  MAX_LOG_ENTRIES,
  redactUrl,
} from "@zam/capture/domain/value-objects/devtools-snapshot";
import { MAX_URL_LENGTH } from "@zam/capture/domain/value-objects/page-url";

export const DEVTOOLS_BUFFER_KEY = "zam.devtools";

interface DevtoolsBuffer {
  console: ConsoleEntry[];
  network: NetworkRequest[];
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

const installFetchHook = (buffer: DevtoolsBuffer): void => {
  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const method = (
      init?.method ?? (input instanceof Request ? input.method : "GET")
    ).toUpperCase();
    const url = resolveUrl(
      input instanceof Request ? input.url : String(input)
    );
    const startedAt = Date.now();
    try {
      const response = await originalFetch(input, init);
      pushBounded(buffer.network, {
        durationMs: Date.now() - startedAt,
        method,
        status: response.status,
        timestamp: startedAt,
        url,
      });
      return response;
    } catch (error) {
      pushBounded(buffer.network, {
        durationMs: Date.now() - startedAt,
        method,
        status: 0,
        timestamp: startedAt,
        url,
      });
      throw error;
    }
  };
};

const xhrRequests = new WeakMap<
  XMLHttpRequest,
  { method: string; url: string; startedAt: number }
>();

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

  const originalSend = XMLHttpRequest.prototype.send;
  const patchedSend = function patchedSend(
    this: XMLHttpRequest,
    ...args: unknown[]
  ) {
    this.addEventListener("loadend", () => {
      const request = xhrRequests.get(this);
      if (request) {
        pushBounded(buffer.network, {
          durationMs: Date.now() - request.startedAt,
          method: request.method,
          status: this.status,
          timestamp: request.startedAt,
          url: request.url,
        });
      }
    });
    return originalSend.apply(
      this,
      args as unknown as Parameters<typeof originalSend>
    );
  } as typeof originalSend;
  XMLHttpRequest.prototype.send = patchedSend;
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
  const buffer: DevtoolsBuffer = { console: [], network: [] };
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
};
