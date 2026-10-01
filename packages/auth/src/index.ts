import { drizzleAdapter } from "@better-auth/drizzle-adapter/relations-v2";
import type { Database } from "@zam/db";
import * as schema from "@zam/db/schema/auth";
import { betterAuth } from "better-auth";
import { tanstackStartCookies } from "better-auth/tanstack-start";

import { GOOGLE_DRIVE_FILE_SCOPE } from "./scopes";

export interface AuthConfig {
  BETTER_AUTH_URL: string;
  BETTER_AUTH_SECRET: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
}

export const createAuth = (env: AuthConfig, database: Database) =>
  betterAuth({
    account: { encryptOAuthTokens: true },
    baseURL: env.BETTER_AUTH_URL,
    database: drizzleAdapter(database, {
      provider: "pg",
      schema,
    }),
    plugins: [tanstackStartCookies()],
    secret: env.BETTER_AUTH_SECRET,
    socialProviders: {
      google: {
        // offline + consent guarantees Google issues a refresh token.
        accessType: "offline",
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        prompt: "select_account consent",
        scope: [GOOGLE_DRIVE_FILE_SCOPE],
      },
    },
    trustedOrigins: [env.BETTER_AUTH_URL],
  });

export type Auth = ReturnType<typeof createAuth>;
export type Session = Auth["$Infer"]["Session"];
