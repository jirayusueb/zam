import { ORPCError } from "@orpc/server";
import { VideoStorageError } from "@zam/capture/application/ports/video-storage-error";
import {
  MAX_PAGE_SIZE,
  MAX_SEARCH_QUERY_LENGTH,
} from "@zam/capture/application/queries/list-my-bug-reports";
import { BUG_REPORT_SORTS } from "@zam/capture/application/query-specifications/bug-report-query";
import type { CaptureDomainError } from "@zam/capture/domain/capture-domain-error";
import {
  CONSOLE_LEVELS,
  MAX_LOG_ENTRIES,
} from "@zam/capture/domain/value-objects/devtools-snapshot";
import {
  COOKIE_SAME_SITE,
  MAX_STORAGE_ENTRIES,
} from "@zam/capture/domain/value-objects/storage-snapshot";
import {
  MAX_DESCRIPTION_LENGTH,
  MAX_TAGS,
  MAX_TAG_LENGTH,
  REPORT_PRIORITIES,
  REPORT_STATUSES,
} from "@zam/capture/domain/value-objects/triage";
import {
  MAX_USER_STEPS,
  USER_STEP_KINDS,
} from "@zam/capture/domain/value-objects/user-step";
import { VIDEO_MIME_TYPE } from "@zam/capture/domain/value-objects/video-recording";
import type { Result } from "@zam/capture/shared/result";
import { z } from "zod";

import { protectedProcedure, publicProcedure } from "../index";

const domainErrorStatus = {
  BUG_REPORT_ACCESS_DENIED: "FORBIDDEN",
  BUG_REPORT_ALREADY_PUBLISHED: "CONFLICT",
  BUG_REPORT_NOT_FOUND: "NOT_FOUND",
  COMMENT_NOT_FOUND: "NOT_FOUND",
  INVALID_BUG_REPORT: "BAD_REQUEST",
  INVALID_COMMENT: "BAD_REQUEST",
} as const;

const storageErrorStatus = {
  ACCESS_NOT_GRANTED: "PRECONDITION_FAILED",
  SHARING_REJECTED: "BAD_GATEWAY",
  UNAVAILABLE: "BAD_GATEWAY",
  VIDEO_NOT_FOUND: "NOT_FOUND",
} as const;

const unwrapOrThrow = <T>(result: Result<T, CaptureDomainError>): T => {
  if (!result.ok) {
    throw new ORPCError(domainErrorStatus[result.error.code], {
      message: result.error.message,
    });
  }
  return result.value;
};

const storageErrors = publicProcedure.middleware(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error instanceof VideoStorageError) {
      throw new ORPCError(storageErrorStatus[error.code], {
        message: error.message,
      });
    }
    throw error;
  }
});

const devtoolsInputShape = {
  console: z
    .array(
      z.object({
        level: z.enum(CONSOLE_LEVELS),
        message: z.string(),
        timestamp: z.number(),
      })
    )
    .max(MAX_LOG_ENTRIES),
  network: z
    .array(
      z.object({
        durationMs: z.number(),
        method: z.string(),
        requestBody: z.string().nullish(),
        requestHeaders: z.record(z.string(), z.string()).nullish(),
        responseBody: z.string().nullish(),
        responseHeaders: z.record(z.string(), z.string()).nullish(),
        status: z.int(),
        timestamp: z.number(),
        url: z.string(),
      })
    )
    .max(MAX_LOG_ENTRIES),
};

const storageItemsInput = z
  .array(z.object({ key: z.string(), value: z.string() }))
  .max(MAX_STORAGE_ENTRIES);

// Optional so extensions released before storage capture can still draft.
const storageInput = z
  .object({
    cookies: z
      .array(
        z.object({
          domain: z.string(),
          expiresAt: z.number().nullable(),
          httpOnly: z.boolean(),
          name: z.string(),
          path: z.string(),
          sameSite: z.enum(COOKIE_SAME_SITE),
          secure: z.boolean(),
          value: z.string(),
        })
      )
      .max(MAX_STORAGE_ENTRIES),
    localStorage: storageItemsInput,
    sessionStorage: storageItemsInput,
  })
  .default({ cookies: [], localStorage: [], sessionStorage: [] });

// Both default so extensions released before step/environment capture can still draft.
const stepsInput = z
  .array(
    z.object({
      detail: z.string(),
      kind: z.enum(USER_STEP_KINDS),
      timestamp: z.number(),
    })
  )
  .max(MAX_USER_STEPS)
  .default([]);

const pixelSizeInput = z.object({ height: z.number(), width: z.number() });

const environmentInput = z
  .object({
    browser: z.string(),
    connection: z
      .object({ downlinkMbps: z.number(), effectiveType: z.string() })
      .nullable(),
    devicePixelRatio: z.number(),
    language: z.string(),
    os: z.string(),
    screen: pixelSizeInput,
    timeZone: z.string(),
    userAgent: z.string(),
    viewport: pixelSizeInput,
  })
  .nullable()
  .default(null);

export const bugReportRouter = {
  delete: protectedProcedure
    .input(z.object({ reportId: z.string() }))
    .handler(async ({ context, input }) => {
      unwrapOrThrow(
        await context.capture.deleteBugReport({
          actorId: context.session.user.id,
          reportId: input.reportId,
        })
      );
      return { ok: true as const };
    }),

  draft: protectedProcedure
    .use(storageErrors)
    .input(
      z.object({
        devtools: z.object(devtoolsInputShape),
        environment: environmentInput,
        metadata: z.record(z.string(), z.string()).default({}),
        pageUrl: z.string().nullable(),
        recording: z.object({
          durationMs: z.int(),
          mimeType: z.literal(VIDEO_MIME_TYPE),
          sizeBytes: z.int(),
          startedAt: z.date(),
        }),
        steps: stepsInput,
        storage: storageInput,
        title: z.string(),
      })
    )
    .handler(async ({ context, input }) =>
      unwrapOrThrow(
        await context.capture.draftBugReport({
          devtools: input.devtools,
          environment: input.environment,
          metadata: input.metadata,
          pageUrl: input.pageUrl,
          recording: input.recording,
          reporterId: context.session.user.id,
          steps: input.steps,
          storage: input.storage,
          title: input.title,
        })
      )
    ),

  getShared: publicProcedure
    .use(storageErrors)
    .input(z.object({ reportId: z.string() }))
    .handler(async ({ context, input }) =>
      unwrapOrThrow(
        await context.capture.viewSharedBugReport({
          reportId: input.reportId,
          viewerId: context.session?.user.id ?? null,
        })
      )
    ),

  listActivities: protectedProcedure
    .input(z.object({ reportId: z.string() }))
    .handler(async ({ context, input }) =>
      unwrapOrThrow(
        await context.capture.listReportActivities({
          reportId: input.reportId,
        })
      )
    ),

  // Comments are for signed-in users only, reading included.
  listComments: protectedProcedure
    .input(z.object({ reportId: z.string() }))
    .handler(async ({ context, input }) =>
      unwrapOrThrow(
        await context.capture.listReportComments({ reportId: input.reportId })
      )
    ),

  listMine: protectedProcedure
    .use(storageErrors)
    .input(
      z.object({
        page: z.int().min(1).optional(),
        pageSize: z.int().min(1).max(MAX_PAGE_SIZE).optional(),
        query: z.string().max(MAX_SEARCH_QUERY_LENGTH).optional(),
        sort: z.enum(BUG_REPORT_SORTS).optional(),
        status: z.enum(["draft", "published"]).optional(),
      })
    )
    .handler(async ({ context, input }) =>
      unwrapOrThrow(
        await context.capture.listMyBugReports({
          ...input,
          reporterId: context.session.user.id,
        })
      )
    ),

  listParticipants: protectedProcedure
    .input(z.object({ reportId: z.string() }))
    .handler(async ({ context, input }) =>
      unwrapOrThrow(
        await context.capture.listReportParticipants({
          reportId: input.reportId,
        })
      )
    ),

  postComment: protectedProcedure
    .input(
      z.object({
        body: z.string(),
        replyToId: z.string().optional(),
        reportId: z.string(),
      })
    )
    .handler(async ({ context, input }) =>
      unwrapOrThrow(
        await context.capture.postComment({
          ...input,
          authorId: context.session.user.id,
        })
      )
    ),

  publish: protectedProcedure
    .use(storageErrors)
    .input(z.object({ reportId: z.string(), videoFileId: z.string().min(1) }))
    .handler(async ({ context, input }) =>
      unwrapOrThrow(
        await context.capture.publishBugReport({
          actorId: context.session.user.id,
          reportId: input.reportId,
          video: { fileId: input.videoFileId },
        })
      )
    ),

  update: protectedProcedure
    .input(
      z.object({
        assigneeId: z.string().nullable().optional(),
        description: z.string().max(MAX_DESCRIPTION_LENGTH).optional(),
        metadata: z.record(z.string(), z.string()).optional(),
        priority: z.enum(REPORT_PRIORITIES).optional(),
        reportId: z.string(),
        status: z.enum(REPORT_STATUSES).optional(),
        tags: z.array(z.string().max(MAX_TAG_LENGTH)).max(MAX_TAGS).optional(),
        title: z.string().optional(),
      })
    )
    .handler(async ({ context, input }) => {
      const { reportId, ...changes } = input;
      unwrapOrThrow(
        await context.capture.editBugReport({
          ...changes,
          actorId: context.session.user.id,
          reportId,
        })
      );
      return unwrapOrThrow(
        await context.capture.viewSharedBugReport({
          reportId,
          viewerId: context.session.user.id,
        })
      );
    }),
};
