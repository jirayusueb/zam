import { describe, expect, it } from "bun:test";

import { draftBugReport } from "../../domain/entities/bug-report";
import type { BugReport } from "../../domain/entities/bug-report";
import type { BugReportRepository } from "../../domain/repositories/bug-report-repository";
import { parseReportId } from "../../domain/value-objects/report-id";
import { parseReporterId } from "../../domain/value-objects/reporter-id";
import { EMPTY_STORAGE_SNAPSHOT } from "../../domain/value-objects/storage-snapshot";
import { VIDEO_MIME_TYPE } from "../../domain/value-objects/video-recording";
import { none, some } from "../../shared/option";
import { unwrap } from "../../shared/result";
import { createDeleteBugReport } from "./delete-bug-report";

const reporterA = unwrap(
  parseReporterId("11111111-1111-1111-1111-111111111111")
);
const reporterB = unwrap(
  parseReporterId("22222222-2222-2222-2222-222222222222")
);
const reportId = unwrap(parseReportId("33333333-3333-3333-3333-333333333333"));

const draft = (): BugReport =>
  unwrap(
    draftBugReport(
      {
        devtools: { console: [], network: [] },
        environment: null,
        pageUrl: null,
        recording: {
          durationMs: 1000,
          mimeType: VIDEO_MIME_TYPE,
          sizeBytes: 100,
          startedAt: new Date(),
        },
        reporterId: reporterA,
        steps: [],
        storage: EMPTY_STORAGE_SNAPSHOT,
        title: "A bug",
      },
      { id: reportId, now: () => new Date() }
    )
  );

const createFakeRepository = (
  report: BugReport
): BugReportRepository & { deleted: () => boolean } => {
  let deletedId: string | null = null;
  return {
    deleteById: (id) => {
      deletedId = id;
      return Promise.resolve();
    },
    deleted: () => deletedId === report.id,
    findById: (id) => Promise.resolve(id === report.id ? some(report) : none),
    save: () => Promise.resolve(),
  };
};

describe("deleteBugReport use case", () => {
  it("rejects a non-reporter actor and deletes nothing", async () => {
    const report = draft();
    const reports = createFakeRepository(report);
    const deleteBugReport = createDeleteBugReport({ reports });

    const result = await deleteBugReport({
      actorId: reporterB,
      reportId,
    });

    expect(result).toMatchObject({
      error: { code: "BUG_REPORT_ACCESS_DENIED" },
      ok: false,
    });
    expect(reports.deleted()).toBe(false);
  });

  it("deletes the report for the reporter", async () => {
    const report = draft();
    const reports = createFakeRepository(report);
    const deleteBugReport = createDeleteBugReport({ reports });

    const result = await deleteBugReport({
      actorId: reporterA,
      reportId,
    });

    expect(result.ok).toBe(true);
    expect(reports.deleted()).toBe(true);
  });

  it("returns BUG_REPORT_NOT_FOUND for a missing report", async () => {
    const reports = createFakeRepository(draft());
    const deleteBugReport = createDeleteBugReport({ reports });

    const result = await deleteBugReport({
      actorId: reporterA,
      reportId: "44444444-4444-4444-4444-444444444444",
    });

    expect(result).toMatchObject({
      error: { code: "BUG_REPORT_NOT_FOUND" },
      ok: false,
    });
  });
});
