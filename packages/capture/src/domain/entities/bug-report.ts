import { checkRules } from "../../shared/domain-rule";
import type { Entity } from "../../shared/entity";
import { ok } from "../../shared/result";
import type { Result } from "../../shared/result";
import type { CaptureDomainError } from "../capture-domain-error";
import { invalidBugReport } from "../capture-domain-error";
import {
  onlyReporterMayEdit,
  onlyReporterMayPublish,
  publishOnlyOnce,
} from "../rules/bug-report-rules";
import { parseClientEnvironment } from "../value-objects/client-environment";
import type { ClientEnvironment } from "../value-objects/client-environment";
import { parseDevtoolsSnapshot } from "../value-objects/devtools-snapshot";
import type { DevtoolsSnapshot } from "../value-objects/devtools-snapshot";
import { parsePageUrl } from "../value-objects/page-url";
import type { PageUrl } from "../value-objects/page-url";
import type { ReportId } from "../value-objects/report-id";
import { parseReportMetadata } from "../value-objects/report-metadata";
import type { ReportMetadata } from "../value-objects/report-metadata";
import type { ReporterId } from "../value-objects/reporter-id";
import { parseStorageSnapshot } from "../value-objects/storage-snapshot";
import type { StorageSnapshot } from "../value-objects/storage-snapshot";
import { parseStoredVideo } from "../value-objects/stored-video";
import type { StoredVideo } from "../value-objects/stored-video";
import { parseTitle } from "../value-objects/title";
import type { Title } from "../value-objects/title";
import {
  DEFAULT_TRIAGE,
  MAX_DESCRIPTION_LENGTH,
  MAX_TAGS,
  MAX_TAG_LENGTH,
} from "../value-objects/triage";
import type {
  ReportPriority,
  ReportStatus,
  Triage,
} from "../value-objects/triage";
import { parseUserSteps } from "../value-objects/user-step";
import type { UserStep } from "../value-objects/user-step";
import { parseVideoRecording } from "../value-objects/video-recording";
import type { VideoRecording } from "../value-objects/video-recording";
import type { ReportActivity, ReportActivityKind } from "./report-activity";

export type BugReportStatus = "draft" | "published";

interface BaseBugReport extends Entity<ReportId> {
  reporterId: ReporterId;
  title: Title;
  description: string;
  pageUrl: PageUrl | null;
  recording: VideoRecording;
  devtools: DevtoolsSnapshot;
  storage: StorageSnapshot;
  steps: readonly UserStep[];
  /** `null` for reports captured before environment capture existed. */
  environment: ClientEnvironment | null;
  triage: Triage;
  metadata: ReportMetadata;
  createdAt: Date;
}

export interface DraftBugReport extends BaseBugReport {
  status: "draft";
  video: null;
}

export interface PublishedBugReport extends BaseBugReport {
  status: "published";
  video: StoredVideo;
}

export type BugReport = DraftBugReport | PublishedBugReport;

export interface DraftBugReportInput {
  reporterId: ReporterId;
  title: string;
  pageUrl: string | null;
  recording: VideoRecording;
  devtools: DevtoolsSnapshot;
  storage: StorageSnapshot;
  steps: readonly UserStep[];
  environment: ClientEnvironment | null;
  metadata?: Record<string, string>;
}

export const draftBugReport = (
  input: DraftBugReportInput,
  deps: { id: ReportId; now: () => Date }
): Result<DraftBugReport, CaptureDomainError> => {
  const title = parseTitle(input.title);
  if (!title.ok) {
    return title;
  }
  const pageUrl =
    input.pageUrl === null ? ok(null) : parsePageUrl(input.pageUrl);
  if (!pageUrl.ok) {
    return pageUrl;
  }
  const recording = parseVideoRecording(input.recording);
  if (!recording.ok) {
    return recording;
  }
  const devtools = parseDevtoolsSnapshot(input.devtools);
  if (!devtools.ok) {
    return devtools;
  }
  const storage = parseStorageSnapshot(input.storage);
  if (!storage.ok) {
    return storage;
  }
  const steps = parseUserSteps(input.steps);
  if (!steps.ok) {
    return steps;
  }
  const environment =
    input.environment === null
      ? ok(null)
      : parseClientEnvironment(input.environment);
  if (!environment.ok) {
    return environment;
  }
  const metadata = parseReportMetadata(input.metadata ?? {});
  if (!metadata.ok) {
    return metadata;
  }
  return ok({
    createdAt: deps.now(),
    description: "",
    devtools: devtools.value,
    environment: environment.value,
    id: deps.id,
    metadata: metadata.value,
    pageUrl: pageUrl.value,
    recording: recording.value,
    reporterId: input.reporterId,
    status: "draft",
    steps: steps.value,
    storage: storage.value,
    title: title.value,
    triage: DEFAULT_TRIAGE,
    video: null,
  });
};

export const publishBugReport = (
  report: BugReport,
  actorId: ReporterId,
  video: StoredVideo
): Result<PublishedBugReport, CaptureDomainError> => {
  const checked = checkRules(
    onlyReporterMayPublish(report, actorId),
    publishOnlyOnce(report)
  );
  if (!checked.ok) {
    return checked;
  }
  const stored = parseStoredVideo(video);
  if (!stored.ok) {
    return stored;
  }
  return ok({ ...report, status: "published", video: stored.value });
};

export interface EditBugReportChanges {
  title?: string;
  description?: string;
  status?: ReportStatus;
  priority?: ReportPriority;
  assigneeId?: string | null;
  tags?: string[];
  metadata?: Record<string, string>;
}

export interface EditBugReportResult {
  report: BugReport;
  activities: ReportActivity[];
}

interface EditBugReportDeps {
  now: () => Date;
  generateActivityId: () => string;
}

/** Trims, drops empties, dedupes case-insensitively, then enforces the count/length limits. */
const normalizeTags = (
  tags: string[]
): Result<string[], CaptureDomainError> => {
  const trimmed = tags.map((tag) => tag.trim()).filter((tag) => tag.length > 0);
  const seen = new Set<string>();
  const deduped: string[] = [];
  for (const tag of trimmed) {
    const key = tag.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(tag);
    }
  }
  const checked = checkRules(
    {
      holds: () => deduped.length <= MAX_TAGS,
      violation: () =>
        invalidBugReport(`tags exceed the maximum of ${MAX_TAGS}`),
    },
    {
      holds: () => deduped.every((tag) => tag.length <= MAX_TAG_LENGTH),
      violation: () =>
        invalidBugReport(
          `each tag must be at most ${MAX_TAG_LENGTH} characters`
        ),
    }
  );
  return checked.ok ? ok(deduped) : checked;
};

const sameValue = (a: unknown, b: unknown): boolean =>
  JSON.stringify(a) === JSON.stringify(b);

/**
 * Reporter-only. Applies only the provided fields; unset fields are left alone and a
 * field that resolves to its current value produces no activity. Assignee participation
 * is enforced by the application layer (it needs the comment read port).
 */
export const editBugReport = (
  report: BugReport,
  actorId: ReporterId,
  changes: EditBugReportChanges,
  deps: EditBugReportDeps
): Result<EditBugReportResult, CaptureDomainError> => {
  const checked = checkRules(onlyReporterMayEdit(report, actorId));
  if (!checked.ok) {
    return checked;
  }

  let next = report;
  const activities: ReportActivity[] = [];
  const record = (kind: ReportActivityKind, from: unknown, to: unknown) => {
    activities.push({
      actorId,
      createdAt: deps.now(),
      from,
      id: deps.generateActivityId(),
      kind,
      reportId: report.id,
      to,
    });
  };

  if (changes.title !== undefined) {
    const title = parseTitle(changes.title);
    if (!title.ok) {
      return title;
    }
    if (title.value !== next.title) {
      record("title_changed", next.title, title.value);
      next = { ...next, title: title.value };
    }
  }

  if (changes.description !== undefined) {
    const description = changes.description.trim();
    const validDescription = checkRules({
      holds: () => description.length <= MAX_DESCRIPTION_LENGTH,
      violation: () =>
        invalidBugReport(
          `description must be at most ${MAX_DESCRIPTION_LENGTH} characters`
        ),
    });
    if (!validDescription.ok) {
      return validDescription;
    }
    if (description !== next.description) {
      record("description_changed", next.description, description);
      next = { ...next, description };
    }
  }

  if (changes.status !== undefined && changes.status !== next.triage.status) {
    record("status_changed", next.triage.status, changes.status);
    next = { ...next, triage: { ...next.triage, status: changes.status } };
  }

  if (
    changes.priority !== undefined &&
    changes.priority !== next.triage.priority
  ) {
    record("priority_changed", next.triage.priority, changes.priority);
    next = { ...next, triage: { ...next.triage, priority: changes.priority } };
  }

  if (
    changes.assigneeId !== undefined &&
    changes.assigneeId !== next.triage.assigneeId
  ) {
    record("assignee_changed", next.triage.assigneeId, changes.assigneeId);
    next = {
      ...next,
      triage: { ...next.triage, assigneeId: changes.assigneeId },
    };
  }

  if (changes.tags !== undefined) {
    const tags = normalizeTags(changes.tags);
    if (!tags.ok) {
      return tags;
    }
    if (!sameValue(tags.value, next.triage.tags)) {
      record("tags_changed", next.triage.tags, tags.value);
      next = { ...next, triage: { ...next.triage, tags: tags.value } };
    }
  }

  if (changes.metadata !== undefined) {
    const metadata = parseReportMetadata(changes.metadata);
    if (!metadata.ok) {
      return metadata;
    }
    if (!sameValue(metadata.value, next.metadata)) {
      record("metadata_changed", next.metadata, metadata.value);
      next = { ...next, metadata: metadata.value };
    }
  }

  return ok({ activities, report: next });
};
