import { describe, expect, it } from "bun:test";

import { unwrap } from "../../shared/result";
import type { Result } from "../../shared/result";
import type { CaptureDomainError } from "../capture-domain-error";
import { parseReportId } from "../value-objects/report-id";
import { parseReporterId } from "../value-objects/reporter-id";
import { EMPTY_STORAGE_SNAPSHOT } from "../value-objects/storage-snapshot";
import { VIDEO_MIME_TYPE } from "../value-objects/video-recording";
import { draftBugReport, editBugReport, publishBugReport } from "./bug-report";

const reporterA = unwrap(
  parseReporterId("11111111-1111-1111-1111-111111111111")
);
const reporterB = unwrap(
  parseReporterId("22222222-2222-2222-2222-222222222222")
);
const reportId = unwrap(parseReportId("33333333-3333-3333-3333-333333333333"));

const validInput = () => ({
  devtools: { console: [], network: [] },
  environment: null,
  pageUrl: "https://example.com/page",
  recording: {
    durationMs: 5000,
    mimeType: VIDEO_MIME_TYPE,
    sizeBytes: 1000,
    startedAt: new Date(),
  },
  reporterId: reporterA,
  steps: [],
  storage: EMPTY_STORAGE_SNAPSHOT,
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

const editDeps = () => {
  let next = 0;
  return {
    generateActivityId: () => {
      next += 1;
      return `activity-${next}`;
    },
    now: () => new Date(),
  };
};

describe("editBugReport", () => {
  it("rejects a non-reporter actor", () => {
    expect(
      errorCode(
        editBugReport(draft(), reporterB, { title: "New title" }, editDeps())
      )
    ).toBe("BUG_REPORT_ACCESS_DENIED");
  });

  it("trims, dedupes case-insensitively, and normalizes tags", () => {
    const edited = unwrap(
      editBugReport(
        draft(),
        reporterA,
        { tags: ["  Bug  ", "bug", "UI", ""] },
        editDeps()
      )
    );
    expect(edited.report.triage.tags).toEqual(["Bug", "UI"]);
    expect(edited.activities).toHaveLength(1);
    expect(edited.activities[0]?.kind).toBe("tags_changed");
  });

  it("rejects more than MAX_TAGS tags", () => {
    const tooMany = Array.from({ length: 21 }, (_, i) => `tag${i}`);
    expect(
      errorCode(
        editBugReport(draft(), reporterA, { tags: tooMany }, editDeps())
      )
    ).toBe("INVALID_BUG_REPORT");
  });

  it("produces no activity for a field that resolves to its current value", () => {
    const edited = unwrap(
      editBugReport(
        draft(),
        reporterA,
        { status: "open", title: "A bug" },
        editDeps()
      )
    );
    expect(edited.activities).toHaveLength(0);
    expect(edited.report).toEqual(draft());
  });

  it("records an activity per changed field", () => {
    const edited = unwrap(
      editBugReport(
        draft(),
        reporterA,
        { description: "steps to repro", priority: "high", status: "resolved" },
        editDeps()
      )
    );
    const kinds = edited.activities.map((activity) => activity.kind).toSorted();
    expect(kinds).toEqual([
      "description_changed",
      "priority_changed",
      "status_changed",
    ]);
    expect(edited.report.triage.status).toBe("resolved");
    expect(edited.report.triage.priority).toBe("high");
    expect(edited.report.description).toBe("steps to repro");
  });
});
