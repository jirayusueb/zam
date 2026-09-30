import type { NetworkRequest } from "@zam/capture/domain/value-objects/devtools-snapshot";

import { isErrorStatus } from "./network-request-format";

/** A request that never completed (status 0) or answered 4xx/5xx. */
export const isFailedRequest = (request: NetworkRequest): boolean =>
  isErrorStatus(request.status);
