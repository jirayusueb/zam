import { createFileRoute } from "@tanstack/react-router";

import { createAuth } from "@/shared/api/server/services";

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = await createAuth();
        return auth.handler(request);
      },
      POST: async ({ request }) => {
        const auth = await createAuth();
        return auth.handler(request);
      },
    },
  },
});
