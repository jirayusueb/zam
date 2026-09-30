import { describe, expect, it } from "bun:test";

import {
  MAX_STORAGE_ENTRIES,
  MAX_STORAGE_VALUE_LENGTH,
  parseStorageSnapshot,
  redactStorageSnapshot,
} from "./storage-snapshot";
import type { StoredCookie } from "./storage-snapshot";

const cookie = (overrides: Partial<StoredCookie>): StoredCookie => ({
  domain: "example.com",
  expiresAt: null,
  httpOnly: false,
  name: "theme",
  path: "/",
  sameSite: "lax",
  secure: false,
  value: "dark",
  ...overrides,
});

describe("redactStorageSnapshot", () => {
  it("redacts HttpOnly cookies and secret-named entries, keeps the rest", () => {
    const redacted = redactStorageSnapshot({
      cookies: [
        cookie({ httpOnly: true, name: "sid", value: "s3cr3t" }),
        cookie({ name: "csrf_token", value: "abc" }),
        cookie({}),
      ],
      localStorage: [
        { key: "sb-auth", value: "jwt" },
        { key: "cart", value: "[1]" },
      ],
      sessionStorage: [{ key: "apiKey", value: "k" }],
    });
    expect(redacted.cookies.map((entry) => entry.value)).toEqual([
      "[REDACTED]",
      "[REDACTED]",
      "dark",
    ]);
    expect(redacted.localStorage).toEqual([
      { key: "sb-auth", value: "[REDACTED]" },
      { key: "cart", value: "[1]" },
    ]);
    expect(redacted.sessionStorage[0]?.value).toBe("[REDACTED]");
  });

  it("truncates to limits the parser accepts", () => {
    const redacted = redactStorageSnapshot({
      cookies: [],
      localStorage: Array.from({ length: MAX_STORAGE_ENTRIES + 1 }, (_, i) => ({
        key: `k${i}`,
        value: "x".repeat(MAX_STORAGE_VALUE_LENGTH + 1),
      })),
      sessionStorage: [],
    });
    expect(redacted.localStorage).toHaveLength(MAX_STORAGE_ENTRIES);
    expect(parseStorageSnapshot(redacted).ok).toBe(true);
  });
});

describe("parseStorageSnapshot", () => {
  it("rejects oversized values from an unredacted client", () => {
    const result = parseStorageSnapshot({
      cookies: [cookie({ value: "x".repeat(MAX_STORAGE_VALUE_LENGTH + 1) })],
      localStorage: [],
      sessionStorage: [],
    });
    expect(result.ok).toBe(false);
  });
});
