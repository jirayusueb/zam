import { describe, expect, it } from "bun:test";

import { unwrap } from "../../shared/result";
import type { Result } from "../../shared/result";
import type { CaptureDomainError } from "../capture-domain-error";
import { parseReportId } from "../value-objects/report-id";
import { parseReporterId } from "../value-objects/reporter-id";
import { VIDEO_MIME_TYPE } from "../value-objects/video-recording";
import { draftBugReport, publishBugReport } from "./bug-report";

const reporterA = unwrap(
  parseReporterId("11111111-1111-1111-1111-111111111111")
);
const reporterB = unwrap(
  parseReporterId("22222222-2222-2222-2222-222222222222")
);
const reportId = unwrap(parseReportId("33333333-3333-3333-3333-333333333333"));

const validInput = () => ({
  devtools: { console: [], network: [] },
  pageUrl: "https://example.com/page",
  recording: {
    durationMs: 5000,
    mimeType: VIDEO_MIME_TYPE,
    sizeBytes: 1000,
    startedAt: new Date(),
  },
  reporterId: reporterA,
  title: "  A bug  ",
});

const deps = { id: reportId, now: () => new Date() };

const draft = () => unwrap(draftBugReport(validInput(), deps));

const errorCode = (result: Result<unknown, CaptureDomainError>) =>
  result.ok ? null : result.error.code;

describe("draftBugReport", () => {
  it("rejects a whitespace-only title", () => {
    expect(
      errorCode(draftBugReport({ ...validInput(), title: "   " }, deps))
    ).toBe("INVALID_BUG_REPORT");
  });

  it("rejects a 201-char title", () => {
    expect(
      errorCode(
        draftBugReport({ ...validInput(), title: "a".repeat(201) }, deps)
      )
    ).toBe("INVALID_BUG_REPORT");
  });

  it("rejects durationMs = 300_001", () => {
    const input = validInput();
    expect(
      errorCode(
        draftBugReport(
          { ...input, recording: { ...input.recording, durationMs: 300_001 } },
          deps
        )
      )
    ).toBe("INVALID_BUG_REPORT");
  });

  it("rejects 1001 console entries", () => {
    const input = validInput();
    const console = Array.from({ length: 1001 }, () => ({
      level: "log" as const,
      message: "x",
      timestamp: Date.now(),
    }));
    expect(
      errorCode(
        draftBugReport({ ...input, devtools: { console, network: [] } }, deps)
      )
    ).toBe("INVALID_BUG_REPORT");
  });

  it("rejects an ftp: pageUrl", () => {
    expect(
      errorCode(
        draftBugReport({ ...validInput(), pageUrl: "ftp://example.com" }, deps)
      )
    ).toBe("INVALID_BUG_REPORT");
  });

  it("accepts valid input and trims the title", () => {
    const report = draft();
    expect(report.status).toBe("draft");
    expect(report.title).toBe("A bug");
  });
});

describe("publishBugReport", () => {
  it("rejects a non-reporter actor", () => {
    expect(
      errorCode(publishBugReport(draft(), reporterB, { fileId: "f1" }))
    ).toBe("BUG_REPORT_ACCESS_DENIED");
  });

  it("rejects publishing twice", () => {
    const published = unwrap(
      publishBugReport(draft(), reporterA, { fileId: "f1" })
    );
    expect(
      errorCode(publishBugReport(published, reporterA, { fileId: "f2" }))
    ).toBe("BUG_REPORT_ALREADY_PUBLISHED");
  });

  it("publishes successfully", () => {
    const published = unwrap(
      publishBugReport(draft(), reporterA, { fileId: "f1" })
    );
    expect(published.status).toBe("published");
    expect(published.video.fileId).toBe("f1");
  });
});
