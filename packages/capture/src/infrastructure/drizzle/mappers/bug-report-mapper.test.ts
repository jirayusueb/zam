import { describe, expect, it } from "bun:test";

import {
  draftBugReport,
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
      pageUrl: "https://example.com/page",
      recording: {
        durationMs: 5000,
        mimeType: VIDEO_MIME_TYPE,
        sizeBytes: 1000,
        startedAt: new Date(0),
      },
      reporterId,
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
});
