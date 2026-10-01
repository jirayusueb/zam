import { describe, expect, it } from "bun:test";

import type { BugReport } from "../domain/entities/bug-report";
import type { Comment } from "../domain/entities/comment";
import type { BugReportRepository } from "../domain/repositories/bug-report-repository";
import type { CommentRepository } from "../domain/repositories/comment-repository";
import { parseCommentId } from "../domain/value-objects/comment-id";
import { parseReportId } from "../domain/value-objects/report-id";
import { parseReporterId } from "../domain/value-objects/reporter-id";
import { EMPTY_STORAGE_SNAPSHOT } from "../domain/value-objects/storage-snapshot";
import { VIDEO_MIME_TYPE } from "../domain/value-objects/video-recording";
import { none, some } from "../shared/option";
import { unwrap } from "../shared/result";
import { createCaptureUseCases } from "./capture-use-cases";
import type { BugReportReadModel } from "./ports/bug-report-read-model";
import type { VideoStorage, VideoStream } from "./ports/video-storage";
import { VideoStorageError } from "./ports/video-storage-error";
import type { ListMyBugReportsInput } from "./queries/list-my-bug-reports";
import type { BugReportQuery } from "./query-specifications/bug-report-query";

const REPORTER_ID = "11111111-1111-1111-1111-111111111111";
const REPORT_ID = "33333333-3333-3333-3333-333333333333";

const createFakeRepository = (): BugReportRepository & {
  all: () => BugReport[];
} => {
  const store = new Map<string, BugReport>();
  return {
    all: () => [...store.values()],
    findById: (id) => {
      const report = store.get(id);
      return Promise.resolve(report ? some(report) : none);
    },
    save: (report) => {
      store.set(report.id, report);
      return Promise.resolve();
    },
  };
};

const emptyReadModel: BugReportReadModel = {
  findSharedById: () => Promise.resolve(none),
  findVideoLocation: () => Promise.resolve(none),
  searchSummaries: () => Promise.resolve({ items: [], total: 0 }),
};

const noopStorage = (): VideoStorage => ({
  createUploadTicket: () =>
    Promise.resolve({ uploadUrl: "https://upload.example/1" }),
  openVideo: () => Promise.reject(new Error("unexpected openVideo")),
  shareWithAnyone: () => Promise.resolve(),
});

const draftInput = () => ({
  devtools: { console: [], network: [] },
  environment: null,
  pageUrl: null,
  recording: {
    durationMs: 1000,
    mimeType: VIDEO_MIME_TYPE,
    sizeBytes: 100,
    startedAt: new Date(),
  },
  reporterId: REPORTER_ID,
  steps: [],
  storage: EMPTY_STORAGE_SNAPSHOT,
  title: "A bug",
});

const createFakeCommentRepository = (): CommentRepository & {
  all: () => Comment[];
} => {
  const store = new Map<string, Comment>();
  return {
    all: () => [...store.values()],
    findById: (id) => {
      const comment = store.get(id);
      return Promise.resolve(comment ? some(comment) : none);
    },
    save: (comment) => {
      store.set(comment.id, comment);
      return Promise.resolve();
    },
  };
};

const commentDeps = () => {
  let next = 0;
  return {
    activities: { save: () => Promise.resolve() },
    activityReadModel: { listByReport: () => Promise.resolve([]) },
    commentReadModel: { listByReport: () => Promise.resolve([]) },
    comments: createFakeCommentRepository(),
    generateActivityId: () => {
      next += 1;
      return `activity-${next}`;
    },
    generateCommentId: () => {
      next += 1;
      return unwrap(
        parseCommentId(
          `00000000-0000-4000-8000-${String(next).padStart(12, "0")}`
        )
      );
    },
    participants: { listByReport: () => Promise.resolve([]) },
  };
};

describe("draftBugReport use case", () => {
  it("propagates ACCESS_NOT_GRANTED and saves nothing", async () => {
    const reports = createFakeRepository();
    const storage: VideoStorage = {
      ...noopStorage(),
      createUploadTicket: () =>
        Promise.reject(
          new VideoStorageError("ACCESS_NOT_GRANTED", "no access")
        ),
    };
    const useCases = createCaptureUseCases({
      ...commentDeps(),
      generateReportId: () => unwrap(parseReportId(REPORT_ID)),
      now: () => new Date(),
      readModel: emptyReadModel,
      reports,
      storage,
    });

    await expect(useCases.draftBugReport(draftInput())).rejects.toBeInstanceOf(
      VideoStorageError
    );
    expect(reports.all()).toHaveLength(0);
  });
});

describe("publishBugReport use case", () => {
  it("propagates SHARING_REJECTED but leaves the report published", async () => {
    const reports = createFakeRepository();
    const storage: VideoStorage = {
      ...noopStorage(),
      shareWithAnyone: () =>
        Promise.reject(new VideoStorageError("SHARING_REJECTED", "rejected")),
    };
    const useCases = createCaptureUseCases({
      ...commentDeps(),
      generateReportId: () => unwrap(parseReportId(REPORT_ID)),
      now: () => new Date(),
      readModel: emptyReadModel,
      reports,
      storage,
    });
    const { reportId } = unwrap(await useCases.draftBugReport(draftInput()));

    await expect(
      useCases.publishBugReport({
        actorId: REPORTER_ID,
        reportId,
        video: { fileId: "f1" },
      })
    ).rejects.toBeInstanceOf(VideoStorageError);

    const [saved] = reports.all();
    expect(saved?.status).toBe("published");
  });
});

describe("viewSharedBugReport use case", () => {
  it("returns BUG_REPORT_NOT_FOUND for a malformed id", async () => {
    const useCases = createCaptureUseCases({
      ...commentDeps(),
      generateReportId: () => unwrap(parseReportId(REPORT_ID)),
      now: () => new Date(),
      readModel: emptyReadModel,
      reports: createFakeRepository(),
      storage: noopStorage(),
    });

    const result = await useCases.viewSharedBugReport({
      reportId: "abc",
      viewerId: null,
    });

    expect(result).toMatchObject({
      error: { code: "BUG_REPORT_NOT_FOUND" },
      ok: false,
    });
  });
});

const listWith = async (input: ListMyBugReportsInput) => {
  const queries: BugReportQuery[] = [];
  const useCases = createCaptureUseCases({
    ...commentDeps(),
    generateReportId: () => unwrap(parseReportId(REPORT_ID)),
    now: () => new Date(),
    readModel: {
      ...emptyReadModel,
      searchSummaries: (query) => {
        queries.push(query);
        return Promise.resolve({ items: [], total: 45 });
      },
    },
    reports: createFakeRepository(),
    storage: noopStorage(),
  });
  const result = unwrap(await useCases.listMyBugReports(input));
  return { query: queries[0], result };
};

describe("listMyBugReports use case", () => {
  it("ranks by relevance and filters by text when a query is given and no sort is chosen", async () => {
    const { query } = await listWith({
      query: "  checkout crash ",
      reporterId: REPORTER_ID,
    });
    expect(query).toMatchObject({
      orderBy: { by: "relevance", text: "checkout crash" },
      where: {
        all: [
          { kind: "reportedBy", reporterId: REPORTER_ID },
          { kind: "matchesText", text: "checkout crash" },
        ],
      },
    });
  });

  it("falls back to newest with no text filter when relevance is requested without a query", async () => {
    const { query } = await listWith({
      query: "   ",
      reporterId: REPORTER_ID,
      sort: "relevance",
    });
    expect(query?.orderBy).toEqual({ by: "newest" });
    expect(query?.where).toEqual({
      all: [{ kind: "reportedBy", reporterId: REPORTER_ID }],
      kind: "and",
    });
  });

  it("expresses the draft status as not-published and translates 1-based pages to offsets", async () => {
    const { result, query } = await listWith({
      page: 3,
      pageSize: 20,
      reporterId: REPORTER_ID,
      status: "draft",
    });
    expect(query).toMatchObject({ limit: 20, offset: 40 });
    expect(query?.where).toMatchObject({
      all: [
        { kind: "reportedBy" },
        { criteria: { kind: "published" }, kind: "not" },
      ],
    });
    expect(result).toEqual({ items: [], page: 3, pageSize: 20, total: 45 });
  });
});

describe("streamSharedBugReportVideo use case", () => {
  it("fails with BUG_REPORT_NOT_FOUND when no video was uploaded", async () => {
    const useCases = createCaptureUseCases({
      ...commentDeps(),
      generateReportId: () => unwrap(parseReportId(REPORT_ID)),
      now: () => new Date(),
      readModel: {
        ...emptyReadModel,
        findVideoLocation: () =>
          Promise.resolve(
            some({
              reporterId: unwrap(parseReporterId(REPORTER_ID)),
              videoFileId: none,
            })
          ),
      },
      reports: createFakeRepository(),
      storage: noopStorage(),
    });

    const result = await useCases.streamSharedBugReportVideo({
      range: null,
      reportId: REPORT_ID,
    });

    expect(result).toMatchObject({
      error: { code: "BUG_REPORT_NOT_FOUND" },
      ok: false,
    });
  });

  it("opens the reporter's file with the requested range", async () => {
    const stream: VideoStream = {
      body: new ReadableStream(),
      contentLength: "10",
      contentRange: "bytes 0-9/10",
      contentType: "video/webm",
      status: 206,
    };
    let opened: unknown = null;
    const useCases = createCaptureUseCases({
      ...commentDeps(),
      generateReportId: () => unwrap(parseReportId(REPORT_ID)),
      now: () => new Date(),
      readModel: {
        ...emptyReadModel,
        findVideoLocation: () =>
          Promise.resolve(
            some({
              reporterId: unwrap(parseReporterId(REPORTER_ID)),
              videoFileId: some("f1"),
            })
          ),
      },
      reports: createFakeRepository(),
      storage: {
        ...noopStorage(),
        openVideo: (req) => {
          opened = req;
          return Promise.resolve(stream);
        },
      },
    });

    const result = unwrap(
      await useCases.streamSharedBugReportVideo({
        range: "bytes=0-9",
        reportId: REPORT_ID,
      })
    );

    expect(opened).toEqual({
      fileId: "f1",
      range: "bytes=0-9",
      reporterId: REPORTER_ID,
    });
    expect(result).toBe(stream);
  });
});

const setupCommenting = async () => {
  const deps = commentDeps();
  const useCases = createCaptureUseCases({
    ...deps,
    generateReportId: () => unwrap(parseReportId(REPORT_ID)),
    now: () => new Date(),
    readModel: emptyReadModel,
    reports: createFakeRepository(),
    storage: noopStorage(),
  });
  const { reportId } = unwrap(await useCases.draftBugReport(draftInput()));
  return { comments: deps.comments, reportId, useCases };
};

describe("postComment use case", () => {
  it("attaches a reply to a reply to the thread root", async () => {
    const { comments, reportId, useCases } = await setupCommenting();
    const root = unwrap(
      await useCases.postComment({ authorId: "u1", body: " **Hi** ", reportId })
    );
    const reply = unwrap(
      await useCases.postComment({
        authorId: "u2",
        body: "reply",
        replyToId: root.commentId,
        reportId,
      })
    );
    const nested = unwrap(
      await useCases.postComment({
        authorId: "u1",
        body: "nested",
        replyToId: reply.commentId,
        reportId,
      })
    );

    const byId = new Map(comments.all().map((c) => [c.id, c]));
    expect(byId.get(root.commentId)).toMatchObject({
      body: "**Hi**",
      parentId: null,
    });
    expect(byId.get(reply.commentId)?.parentId).toBe(root.commentId);
    expect(byId.get(nested.commentId)?.parentId).toBe(root.commentId);
  });

  it("rejects blank bodies and replies to missing comments without saving", async () => {
    const { comments, reportId, useCases } = await setupCommenting();

    expect(
      await useCases.postComment({ authorId: "u1", body: "  \n ", reportId })
    ).toMatchObject({ error: { code: "INVALID_COMMENT" }, ok: false });
    expect(
      await useCases.postComment({
        authorId: "u1",
        body: "hi",
        replyToId: "44444444-4444-4444-4444-444444444444",
        reportId,
      })
    ).toMatchObject({ error: { code: "COMMENT_NOT_FOUND" }, ok: false });
    expect(comments.all()).toHaveLength(0);
  });

  it("returns BUG_REPORT_NOT_FOUND for a report that does not exist", async () => {
    const { useCases } = await setupCommenting();

    const result = await useCases.postComment({
      authorId: "u1",
      body: "hi",
      reportId: "55555555-5555-5555-5555-555555555555",
    });

    expect(result).toMatchObject({
      error: { code: "BUG_REPORT_NOT_FOUND" },
      ok: false,
    });
  });
});
