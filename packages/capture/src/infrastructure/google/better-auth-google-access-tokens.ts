import type { Auth } from "@zam/auth";
import { GOOGLE_DRIVE_FILE_SCOPE } from "@zam/auth";
import type { Database } from "@zam/db";
import { account } from "@zam/db/schema/auth";
import { eq, and } from "drizzle-orm";

import { VideoStorageError } from "../../application/ports/video-storage-error";

export interface GoogleAccessTokens {
  forUser: (reporterId: string) => Promise<string>;
}

const NOT_GRANTED_MESSAGE =
  "Google Drive access not granted. Sign in again with Google and allow Drive access.";

export const createBetterAuthGoogleAccessTokens = (
  db: Database,
  auth: Auth
): GoogleAccessTokens => ({
  forUser: async (reporterId: string): Promise<string> => {
    const [row] = await db
      .select({ id: account.id })
      .from(account)
      .where(
        and(eq(account.userId, reporterId), eq(account.providerId, "google"))
      )
      .limit(1);
    if (!row) {
      throw new VideoStorageError("ACCESS_NOT_GRANTED", NOT_GRANTED_MESSAGE);
    }
    let result: { accessToken: string; scopes: string[] };
    try {
      result = await auth.api.getAccessToken({
        body: { accountId: row.id, userId: reporterId },
      });
    } catch {
      throw new VideoStorageError("ACCESS_NOT_GRANTED", NOT_GRANTED_MESSAGE);
    }
    if (!result.scopes.includes(GOOGLE_DRIVE_FILE_SCOPE)) {
      throw new VideoStorageError("ACCESS_NOT_GRANTED", NOT_GRANTED_MESSAGE);
    }
    return result.accessToken;
  },
});
