import { describe, expect, it } from "bun:test";

import {
  isSecretHeaderName,
  MAX_NETWORK_BODY_LENGTH,
  MAX_NETWORK_HEADER_COUNT,
  NETWORK_BODY_TRUNCATION_MARKER,
  parseDevtoolsSnapshot,
  REDACTED,
  redactNetworkHeaders,
  redactNetworkRequestDetails,
  redactUrl,
  truncateNetworkBody,
} from "./devtools-snapshot";
import type { NetworkRequest } from "./devtools-snapshot";

describe("redactUrl", () => {
  it("redacts secret-looking query params", () => {
    expect(redactUrl("https://x.test/a?token=abc&q=1")).toBe(
      "https://x.test/a?token=%5BREDACTED%5D&q=1"
    );
  });

  it("leaves non-secret params untouched", () => {
    expect(redactUrl("https://x.test/a?q=1&page=2")).toBe(
      "https://x.test/a?q=1&page=2"
    );
  });

  it("returns unparsable input unchanged", () => {
    expect(redactUrl("not a url")).toBe("not a url");
  });
});

describe("isSecretHeaderName", () => {
  it("flags named secret headers regardless of case", () => {
    expect(isSecretHeaderName("Authorization")).toBe(true);
    expect(isSecretHeaderName("Cookie")).toBe(true);
    expect(isSecretHeaderName("Set-Cookie")).toBe(true);
    expect(isSecretHeaderName("Proxy-Authorization")).toBe(true);
    expect(isSecretHeaderName("X-Api-Key")).toBe(true);
  });

  it("flags headers matching the shared secret-name regex", () => {
    expect(isSecretHeaderName("X-Session-Token")).toBe(true);
  });

  it("leaves ordinary headers untouched", () => {
    expect(isSecretHeaderName("Content-Type")).toBe(false);
  });
});

describe("redactNetworkHeaders", () => {
  it("redacts secret header values and keeps others", () => {
    expect(
      redactNetworkHeaders({
        authorization: "Bearer abc",
        "content-type": "application/json",
      })
    ).toEqual({ authorization: REDACTED, "content-type": "application/json" });
  });

  it("caps the number of headers", () => {
    const headers = Object.fromEntries(
      Array.from({ length: MAX_NETWORK_HEADER_COUNT + 5 }, (_, i) => [
        `h${i}`,
        "v",
      ])
    );
    expect(Object.keys(redactNetworkHeaders(headers) ?? {}).length).toBe(
      MAX_NETWORK_HEADER_COUNT
    );
  });

  it("returns null for null/undefined input", () => {
    expect(redactNetworkHeaders(null)).toBeNull();
    expect(redactNetworkHeaders()).toBeNull();
  });
});

describe("truncateNetworkBody", () => {
  it("passes short bodies through unchanged", () => {
    expect(truncateNetworkBody('{"ok":true}')).toBe('{"ok":true}');
  });

  it("truncates long bodies with a trailing marker", () => {
    const body = "x".repeat(MAX_NETWORK_BODY_LENGTH + 100);
    const truncated = truncateNetworkBody(body);
    expect(truncated).toBe(
      "x".repeat(MAX_NETWORK_BODY_LENGTH) + NETWORK_BODY_TRUNCATION_MARKER
    );
  });

  it("returns null for null/undefined input", () => {
    expect(truncateNetworkBody(null)).toBeNull();
    expect(truncateNetworkBody()).toBeNull();
  });
});

const baseRequest = (): NetworkRequest => ({
  durationMs: 10,
  method: "GET",
  status: 200,
  timestamp: 1,
  url: "https://x.test/a",
});

describe("redactNetworkRequestDetails", () => {
  it("redacts headers and truncates bodies together", () => {
    const request: NetworkRequest = {
      ...baseRequest(),
      requestBody: "x".repeat(MAX_NETWORK_BODY_LENGTH + 10),
      requestHeaders: { cookie: "secret" },
      responseBody: '{"ok":true}',
      responseHeaders: { "content-type": "application/json" },
    };
    const redacted = redactNetworkRequestDetails(request);
    expect(redacted.requestHeaders).toEqual({ cookie: REDACTED });
    expect(redacted.responseHeaders).toEqual({
      "content-type": "application/json",
    });
    expect(redacted.responseBody).toBe('{"ok":true}');
    expect(redacted.requestBody).toBe(
      "x".repeat(MAX_NETWORK_BODY_LENGTH) + NETWORK_BODY_TRUNCATION_MARKER
    );
  });
});

describe("parseDevtoolsSnapshot: network headers/bodies", () => {
  it("accepts a request with no headers/body fields (old reports)", () => {
    const result = parseDevtoolsSnapshot({
      console: [],
      network: [baseRequest()],
    });
    expect(result.ok).toBe(true);
  });

  it("accepts headers and bodies within the caps", () => {
    const result = parseDevtoolsSnapshot({
      console: [],
      network: [
        {
          ...baseRequest(),
          requestBody: "ok",
          requestHeaders: { "content-type": "application/json" },
          responseBody: "ok",
          responseHeaders: { "content-type": "application/json" },
        },
      ],
    });
    expect(result.ok).toBe(true);
  });

  it("rejects a request with more headers than MAX_NETWORK_HEADER_COUNT", () => {
    const headers = Object.fromEntries(
      Array.from({ length: MAX_NETWORK_HEADER_COUNT + 1 }, (_, i) => [
        `h${i}`,
        "v",
      ])
    );
    const result = parseDevtoolsSnapshot({
      console: [],
      network: [{ ...baseRequest(), requestHeaders: headers }],
    });
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error.code).toBe("INVALID_BUG_REPORT");
  });

  it("rejects a body longer than the stored cap (length + truncation marker)", () => {
    const oversized = "x".repeat(
      MAX_NETWORK_BODY_LENGTH + NETWORK_BODY_TRUNCATION_MARKER.length + 1
    );
    const result = parseDevtoolsSnapshot({
      console: [],
      network: [{ ...baseRequest(), responseBody: oversized }],
    });
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error.code).toBe("INVALID_BUG_REPORT");
  });
});
