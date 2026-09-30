import { createServerFn } from "@tanstack/react-start";

import { authMiddleware } from "@/shared/api/server/auth-middleware";

export const getViewer = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(({ context }) => context.session);
