import { describe, expect, it } from "bun:test";

import {
  draftBugReport,
  editBugReport,
  publishBugReport,
} from "../../../domain/entities/bug-report";
import type { BugReport } from "../../../domain/entities/bug-report";
import { parseReportId } from "../../../domain/value-objects/report-id";
import { parseReporterId } from "../../../domain/value-objects/reporter-id";
import { VIDEO_MIME_TYPE } from "../../../domain/value-objects/video-recording";
import { unwrap } from "../../../shared/result";
import { bugReportMapper } from "./bug-report-mapper";

const reporterId = unwrap(
  parseReporterId("11111111-1111-1111-1111-111111111111")
);

const draft = unwrap(
  draftBugReport(
    {
      devtools: {
        console: [{ level: "error", message: "boom", timestamp: 1 }],
        network: [],
      },
      environment: {
        browser: "Chrome 153.0.0.0",
        connection: { downlinkMbps: 10, effectiveType: "4g" },
        devicePixelRatio: 2,
        language: "th-TH",
        os: "macOS 15.4.0",
        screen: { height: 1117, width: 1728 },
        timeZone: "Asia/Bangkok",
        userAgent: "Mozilla/5.0",
        viewport: { height: 900, width: 1440 },
      },
      metadata: { env: "staging" },
      pageUrl: "https://example.com/page",
      recording: {
        durationMs: 5000,
        mimeType: VIDEO_MIME_TYPE,
        sizeBytes: 1000,
        startedAt: new Date(0),
      },
      reporterId,
      steps: [{ detail: '<button#pay> "Pay"', kind: "click", timestamp: 2 }],
      storage: {
        cookies: [
          {
            domain: "example.com",
            expiresAt: null,
            httpOnly: false,
            name: "theme",
            path: "/",
            sameSite: "lax",
            secure: true,
            value: "dark",
          },
        ],
        localStorage: [{ key: "cart", value: "[1,2]" }],
        sessionStorage: [],
      },
      title: "A bug",
    },
    {
      id: unwrap(parseReportId("33333333-3333-3333-3333-333333333333")),
      now: () => new Date(1),
    }
  )
);

const roundTrip = (report: BugReport) =>
  bugReportMapper.toDomain({
    ...bugReportMapper.toPersistence(report),
    searchTsv: "",
  });

describe("bugReportMapper", () => {
  it("round-trips a draft", () => {
    expect(roundTrip(draft)).toEqual(draft);
  });

  it("round-trips a published report, keeping the video", () => {
    const published = unwrap(
      publishBugReport(draft, reporterId, { fileId: "drive-file" })
    );
    expect(roundTrip(published)).toEqual(published);
  });

  it("round-trips an edited report's description, triage, and metadata", () => {
    const edited = unwrap(
      editBugReport(
        draft,
        reporterId,
        {
          assigneeId: "55555555-5555-5555-5555-555555555555",
          description: "steps to repro",
          metadata: { build: "123" },
          priority: "high",
          status: "in_progress",
          tags: ["regression"],
        },
        { generateActivityId: () => "activity-1", now: () => new Date(2) }
      )
    ).report;
    expect(roundTrip(edited)).toEqual(edited);
  });
});
