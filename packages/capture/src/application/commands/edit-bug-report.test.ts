import { describe, expect, it } from "bun:test";

import { draftBugReport } from "../../domain/entities/bug-report";
import type { BugReport } from "../../domain/entities/bug-report";
import type { ReportActivity } from "../../domain/entities/report-activity";
import type { BugReportRepository } from "../../domain/repositories/bug-report-repository";
import { parseReportId } from "../../domain/value-objects/report-id";
import { parseReporterId } from "../../domain/value-objects/reporter-id";
import { EMPTY_STORAGE_SNAPSHOT } from "../../domain/value-objects/storage-snapshot";
import { VIDEO_MIME_TYPE } from "../../domain/value-objects/video-recording";
import { none, some } from "../../shared/option";
import { unwrap } from "../../shared/result";
import { createEditBugReport } from "./edit-bug-report";

const reporterA = unwrap(
  parseReporterId("11111111-1111-1111-1111-111111111111")
);
const reportId = unwrap(parseReportId("33333333-3333-3333-3333-333333333333"));
const commenterId = "44444444-4444-4444-4444-444444444444";

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

const createFakeRepository = (report: BugReport): BugReportRepository => ({
  deleteById: () => Promise.resolve(),
  findById: (id) => Promise.resolve(id === report.id ? some(report) : none),
  save: () => Promise.resolve(),
});

const setup = (participantIds: string[]) => {
  const saved: ReportActivity[] = [];
  const editBugReport = createEditBugReport({
    activities: {
      save: (activity) => {
        saved.push(activity);
        return Promise.resolve();
      },
    },
    generateActivityId: () => "activity-1",
    now: () => new Date(),
    participants: {
      listByReport: () =>
        Promise.resolve(
          participantIds.map((id) => ({
            id,
            image: null,
            isReporter: id === reporterA,
            name: id,
          }))
        ),
    },
    reports: createFakeRepository(draft()),
  });
  return { editBugReport, saved };
};

describe("editBugReport use case", () => {
  it("rejects an assignee who is neither the reporter nor a commenter", async () => {
    const { editBugReport, saved } = setup([reporterA]);

    const result = await editBugReport({
      actorId: reporterA,
      assigneeId: commenterId,
      reportId,
    });

    expect(result).toMatchObject({
      error: { code: "INVALID_BUG_REPORT" },
      ok: false,
    });
    expect(saved).toHaveLength(0);
  });

  it("accepts an assignee who has commented on the report", async () => {
    const { editBugReport, saved } = setup([reporterA, commenterId]);

    const result = await editBugReport({
      actorId: reporterA,
      assigneeId: commenterId,
      reportId,
    });

    expect(result.ok).toBe(true);
    expect(saved).toHaveLength(1);
    expect(saved[0]?.kind).toBe("assignee_changed");
  });

  it("allows unassigning without checking participation", async () => {
    const { editBugReport } = setup([]);

    const result = await editBugReport({
      actorId: reporterA,
      assigneeId: null,
      reportId,
    });

    expect(result.ok).toBe(true);
  });
});
