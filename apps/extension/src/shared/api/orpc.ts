import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { AppRouterClient } from "@zam/api/routers/index";

import { WEB_URL } from "../config/env";

const link = new RPCLink({
  fetch: (url, options) => fetch(url, { ...options, credentials: "include" }),
  url: `${WEB_URL}/api/rpc`,
});

export const orpc: AppRouterClient = createORPCClient(link);
