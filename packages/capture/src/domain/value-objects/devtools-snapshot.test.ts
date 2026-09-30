import { describe, expect, it } from "bun:test";

import { redactUrl } from "./devtools-snapshot";

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
