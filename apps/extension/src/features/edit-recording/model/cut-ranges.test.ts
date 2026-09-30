import { describe, expect, it } from "bun:test";

import { cutDevtools, keptDurationMs, keptSegments } from "./cut-ranges";

describe("keptSegments", () => {
  it("returns the complement of merged, clamped cuts with output offsets", () => {
    const segments = keptSegments(10_000, [
      { endMs: 6000, startMs: 4000 },
      { endMs: 1000, startMs: -500 },
      { endMs: 5000, startMs: 3000 },
      { endMs: 12_000, startMs: 9000 },
    ]);
    expect(segments).toEqual([
      { endMs: 3000, outputStartMs: 0, startMs: 1000 },
      { endMs: 9000, outputStartMs: 2000, startMs: 6000 },
    ]);
    expect(keptDurationMs(segments)).toBe(5000);
  });

  it("keeps everything without cuts and nothing when all is cut", () => {
    expect(keptSegments(3000, [])).toEqual([
      { endMs: 3000, outputStartMs: 0, startMs: 0 },
    ]);
    expect(keptSegments(3000, [{ endMs: 3000, startMs: 0 }])).toEqual([]);
  });
});

describe("cutDevtools", () => {
  it("drops entries inside cuts and shifts later ones onto the edited clock", () => {
    const startedAt = 1_000_000;
    const segments = keptSegments(10_000, [{ endMs: 6000, startMs: 2000 }]);
    const request = { durationMs: 40, method: "GET", status: 200, url: "u" };
    const result = cutDevtools(
      {
        console: [
          { level: "log", message: "before", timestamp: startedAt + 1000 },
          { level: "error", message: "cut", timestamp: startedAt + 3000 },
          { level: "warn", message: "after", timestamp: startedAt + 7000 },
        ],
        network: [{ ...request, timestamp: startedAt + 9000 }],
      },
      startedAt,
      segments
    );
    expect(result.console).toEqual([
      { level: "log", message: "before", timestamp: startedAt + 1000 },
      { level: "warn", message: "after", timestamp: startedAt + 3000 },
    ]);
    expect(result.network).toEqual([
      { ...request, timestamp: startedAt + 5000 },
    ]);
  });
});
