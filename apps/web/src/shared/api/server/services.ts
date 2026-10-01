import type { Auth } from "@zam/auth";
import { createAuth as createConfiguredAuth } from "@zam/auth";
import type { CaptureUseCases } from "@zam/capture/application/capture-use-cases";
import { createCaptureUseCases } from "@zam/capture/application/capture-use-cases";
import { parseCommentId } from "@zam/capture/domain/value-objects/comment-id";
import { parseReportId } from "@zam/capture/domain/value-objects/report-id";
import { createDrizzleBugReportReadModel } from "@zam/capture/infrastructure/drizzle/drizzle-bug-report-read-model";
import { createDrizzleBugReportRepository } from "@zam/capture/infrastructure/drizzle/drizzle-bug-report-repository";
import { createDrizzleCommentReadModel } from "@zam/capture/infrastructure/drizzle/drizzle-comment-read-model";
import { createDrizzleCommentRepository } from "@zam/capture/infrastructure/drizzle/drizzle-comment-repository";
import { createDrizzleReportActivityReadModel } from "@zam/capture/infrastructure/drizzle/drizzle-report-activity-read-model";
import { createDrizzleReportActivityRepository } from "@zam/capture/infrastructure/drizzle/drizzle-report-activity-repository";
import { createDrizzleReportParticipantReadModel } from "@zam/capture/infrastructure/drizzle/drizzle-report-participant-read-model";
import { createBetterAuthGoogleAccessTokens } from "@zam/capture/infrastructure/google/better-auth-google-access-tokens";
import { createGoogleDriveVideoStorage } from "@zam/capture/infrastructure/google/google-drive-video-storage";
import { unwrap } from "@zam/capture/shared/result";
import type { Database } from "@zam/db";
import { createDb } from "@zam/db";

import { ENV } from "../../config/env.server";

export const getDb = (): Database => createDb(ENV);

export const createAuth = (database?: Database): Promise<Auth> =>
  Promise.resolve(createConfiguredAuth(ENV, database ?? getDb()));

export const buildCaptureUseCases = (
  db: Database,
  auth: Auth
): CaptureUseCases =>
  createCaptureUseCases({
    activities: createDrizzleReportActivityRepository(db),
    activityReadModel: createDrizzleReportActivityReadModel(db),
    commentReadModel: createDrizzleCommentReadModel(db),
    comments: createDrizzleCommentRepository(db),
    generateActivityId: () => crypto.randomUUID(),
    generateCommentId: () => unwrap(parseCommentId(crypto.randomUUID())),
    generateReportId: () => unwrap(parseReportId(crypto.randomUUID())),
    now: () => new Date(),
    participants: createDrizzleReportParticipantReadModel(db),
    readModel: createDrizzleBugReportReadModel(db),
    reports: createDrizzleBugReportRepository(db),
    storage: createGoogleDriveVideoStorage(
      createBetterAuthGoogleAccessTokens(db, auth)
    ),
  });
