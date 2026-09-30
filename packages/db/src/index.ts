import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import type { DatabaseConfig } from "./config";
import { relations } from "./relations";

export const createDb = (env: DatabaseConfig) =>
  drizzle({ client: neon(env.DATABASE_URL), relations });

export type Database = ReturnType<typeof createDb>;
