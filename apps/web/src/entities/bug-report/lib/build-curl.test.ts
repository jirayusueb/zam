import { describe, expect, it } from "bun:test";

import { buildCurl } from "./build-curl";

describe("buildCurl", () => {
  it("quotes shell-unsafe values and drops redacted or binary evidence", () => {
    expect(
      buildCurl({
        durationMs: 1,
        method: "POST",
        requestBody: `{"name":"O'Brien"}`,
        requestHeaders: { authorization: "[REDACTED]", "x-note": "it's $HOME" },
        status: 200,
        timestamp: 0,
        url: "https://x.test/a?q=1",
      })
    ).toBe(
      String.raw`curl 'https://x.test/a?q=1' -X 'POST' -H 'x-note: it'\''s $HOME' --data-raw '{"name":"O'\''Brien"}'`
    );
    expect(
      buildCurl({
        durationMs: 1,
        method: "PUT",
        requestBody: "[binary]",
        status: 200,
        timestamp: 0,
        url: "https://x.test/upload",
      })
    ).toBe("curl 'https://x.test/upload' -X 'PUT'");
  });
});
