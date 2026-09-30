import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import type { AnyPgColumn } from "drizzle-orm/pg-core";

import { user } from "./auth";
import { bugReport } from "./bug-report";

export const comment = pgTable(
  "comment",
  {
    authorId: text("author_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /** Markdown source. */
    body: text("body").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    id: text("id").primaryKey(),
    /** Thread root; null for top-level comments. Replies are one level deep. */
    parentId: text("parent_id").references((): AnyPgColumn => comment.id, {
      onDelete: "cascade",
    }),
    reportId: text("report_id")
      .notNull()
      .references(() => bugReport.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("comment_reportId_createdAt_idx").on(table.reportId, table.createdAt),
  ]
);
