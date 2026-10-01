import { index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { user } from "./auth";
import { bugReport } from "./bug-report";

export const reportActivity = pgTable(
  "report_activity",
  {
    actorId: text("actor_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    from: jsonb("from"),
    id: text("id").primaryKey(),
    kind: text("kind").notNull(),
    reportId: text("report_id")
      .notNull()
      .references(() => bugReport.id, { onDelete: "cascade" }),
    to: jsonb("to"),
  },
  (table) => [
    index("report_activity_reportId_createdAt_idx").on(
      table.reportId,
      table.createdAt
    ),
  ]
);
