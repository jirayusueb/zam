import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { OpenAPIReferencePlugin } from "@orpc/openapi/plugins";
import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";
import { createFileRoute } from "@tanstack/react-router";
import { appRouter } from "@zam/api/routers/index";

import { createContext } from "@/shared/api/server/context";

const rpcHandler = new RPCHandler(appRouter, {
  interceptors: [
    // oxlint-disable-next-line promise/prefer-await-to-callbacks -- oRPC's onError takes a sync error-logging callback
    onError((error) => {
      console.error(error);
    }),
  ],
});

const apiHandler = new OpenAPIHandler(appRouter, {
  interceptors: [
    // oxlint-disable-next-line promise/prefer-await-to-callbacks -- oRPC's onError takes a sync error-logging callback
    onError((error) => {
      console.error(error);
    }),
  ],
  plugins: [
    new OpenAPIReferencePlugin({
      schemaConverters: [new ZodToJsonSchemaConverter()],
    }),
  ],
});

const handle = async ({ request }: { request: Request }) => {
  const rpcResult = await rpcHandler.handle(request, {
    context: await createContext({ req: request }),
    prefix: "/api/rpc",
  });
  if (rpcResult.response) {
    return rpcResult.response;
  }

  const apiResult = await apiHandler.handle(request, {
    context: await createContext({ req: request }),
    prefix: "/api/rpc/api-reference",
  });
  if (apiResult.response) {
    return apiResult.response;
  }

  return new Response("Not found", { status: 404 });
};

export const Route = createFileRoute("/api/rpc/$")({
  server: {
    handlers: {
      DELETE: handle,
      GET: handle,
      HEAD: handle,
      PATCH: handle,
      POST: handle,
      PUT: handle,
    },
  },
});
