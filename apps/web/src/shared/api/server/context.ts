import type { Context as ApiContext } from "@zam/api/context";

import { buildCaptureUseCases, createAuth, getDb } from "./services";

export const createContext = async ({
  req,
}: {
  req: Request;
}): Promise<ApiContext> => {
  const db = getDb();
  const auth = await createAuth(db);
  const session = await auth.api.getSession({ headers: req.headers });
  return {
    capture: buildCaptureUseCases(db, auth),
    session,
  };
};
