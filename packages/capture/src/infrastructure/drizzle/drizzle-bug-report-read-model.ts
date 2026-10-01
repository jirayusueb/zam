import type { Database } from "@zam/db";
import { BUG_REPORT_SEARCH_INDEX, bugReport } from "@zam/db/schema/bug-report";
import {
  and,
  asc,
  count,
  desc,
  eq,
  isNotNull,
  not,
  or,
  sql,
} from "drizzle-orm";
import type { SQL } from "drizzle-orm";

import type {
  BugReportReadModel,
  BugReportSummaryPage,
  SharedBugReportRecord,
  VideoLocation,
} from "../../application/ports/bug-report-read-model";
import type {
  BugReportCriteria,
  BugReportCriterion,
  BugReportOrder,
} from "../../application/query-specifications/bug-report-query";
import type { ReportId } from "../../domain/value-objects/report-id";
import { parseReporterId } from "../../domain/value-objects/reporter-id";
import { none, some } from "../../shared/option";
import type { Option } from "../../shared/option";
import { translateCriteria } from "../../shared/query-specification";
import { unwrap } from "../../shared/result";
import { bugReportMapper } from "./mappers/bug-report-mapper";

// Must match the config of the generated `search_tsv` column.
const TEXT_SEARCH_CONFIG = sql.raw("'english'");

const MATCH_ALL = sql`true`;

const criterionToSql = (criterion: BugReportCriterion): SQL => {
  switch (criterion.kind) {
    case "reportedBy": {
      return eq(bugReport.reporterId, criterion.reporterId);
    }
    case "published": {
      return isNotNull(bugReport.videoFileId);
    }
    case "matchesText": {
      return sql`${bugReport.searchTsv} @@ websearch_to_tsquery(${TEXT_SEARCH_CONFIG}, ${criterion.text})`;
    }
    case "triageStatus": {
      return eq(bugReport.triageStatus, criterion.status);
    }
    case "priority": {
      return eq(bugReport.triagePriority, criterion.priority);
    }
    default: {
      throw new Error("unknown bug report criterion");
    }
  }
};

const criteriaToSql = (criteria: BugReportCriteria): SQL =>
  translateCriteria(criteria, {
    and: (parts) => and(...parts) ?? MATCH_ALL,
    leaf: criterionToSql,
    not: (part) => not(part),
    or: (parts) => or(...parts) ?? not(MATCH_ALL),
  });

// Most urgent first; mirrors REPORT_PRIORITIES (unknown values sort last).
const PRIORITY_RANK = sql`case ${bugReport.triagePriority} when 'urgent' then 0 when 'high' then 1 when 'medium' then 2 when 'low' then 3 else 4 end`;

// Counted in SQL so the list never loads the jsonb arrays. Must match the web's
// isFailedRequest: status 0 is a failure only for fetch/xhr/websocket (or legacy rows without a type).
const ERROR_COUNT = sql<number>`(select count(*)::int from jsonb_array_elements(${bugReport.consoleEntries}) e where e->>'level' = 'error')`;
const FAILED_REQUEST_COUNT = sql<number>`(select count(*)::int from jsonb_array_elements(${bugReport.networkRequests}) r where (r->>'status')::int >= 400 or ((r->>'status')::int = 0 and coalesce(r->>'type', 'fetch') in ('fetch', 'xhr', 'websocket')))`;

const orderBy = (order: BugReportOrder): SQL[] => {
  // id tiebreaker keeps offset pagination stable across equal keys.
  const newest = [desc(bugReport.createdAt), asc(bugReport.id)];
  switch (order.by) {
    case "relevance": {
      // lakebase_text `<@>` returns the negative BM25 score: ascending = best first.
      return [
        sql`${bugReport.searchTsv} <@> to_bm25query(to_tsvector(${TEXT_SEARCH_CONFIG}, ${order.text}), ${BUG_REPORT_SEARCH_INDEX}::regclass)`,
        ...newest,
      ];
    }
    case "oldest": {
      return [asc(bugReport.createdAt), asc(bugReport.id)];
    }
    case "title": {
      return [asc(sql`lower(${bugReport.title})`), ...newest];
    }
    case "priority": {
      return [PRIORITY_RANK, ...newest];
    }
    default: {
      return newest;
    }
  }
};

export const createDrizzleBugReportReadModel = (
  db: Database
): BugReportReadModel => ({
  findSharedById: async (
    id: ReportId
  ): Promise<Option<SharedBugReportRecord>> => {
    const [row] = await db
      .select()
      .from(bugReport)
      .where(eq(bugReport.id, id))
      .limit(1);
    return row ? some(bugReportMapper.toSharedRecord(row)) : none;
  },

  findVideoLocation: async (id: ReportId): Promise<Option<VideoLocation>> => {
    const [row] = await db
      .select({
        reporterId: bugReport.reporterId,
        videoFileId: bugReport.videoFileId,
      })
      .from(bugReport)
      .where(eq(bugReport.id, id))
      .limit(1);
    return row
      ? some({
          reporterId: unwrap(parseReporterId(row.reporterId)),
          videoFileId: row.videoFileId === null ? none : some(row.videoFileId),
        })
      : none;
  },

  searchSummaries: async (query): Promise<BugReportSummaryPage> => {
    const where = criteriaToSql(query.where);
    const [rows, [counted]] = await db.batch([
      db
        .select({
          createdAt: bugReport.createdAt,
          errorCount: ERROR_COUNT,
          failedRequestCount: FAILED_REQUEST_COUNT,
          id: bugReport.id,
          pageUrl: bugReport.pageUrl,
          tags: bugReport.tags,
          title: bugReport.title,
          triagePriority: bugReport.triagePriority,
          triageStatus: bugReport.triageStatus,
          videoDurationMs: bugReport.videoDurationMs,
          videoFileId: bugReport.videoFileId,
        })
        .from(bugReport)
        .where(where)
        .orderBy(...orderBy(query.orderBy))
        .limit(query.limit)
        .offset(query.offset),
      db.select({ total: count() }).from(bugReport).where(where),
    ]);
    return {
      items: rows.map(bugReportMapper.toSummary),
      total: counted?.total ?? 0,
    };
  },
});
