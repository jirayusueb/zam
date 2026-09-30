import type { Session } from "@zam/auth";
import type { Database } from "@zam/db";

export type Context = {
  session: Session | null;
  db: Database;
};
