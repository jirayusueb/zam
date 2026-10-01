import type { NetworkRequest } from "@zam/capture/domain/value-objects/devtools-snapshot";
import { isResourceTimingType } from "@zam/capture/domain/value-objects/devtools-snapshot";

import { isErrorStatus } from "./network-request-format";

const UNKNOWN_STATUS = 0;

/** A request that never completed (status 0, except resource-timing types where 0 means "unknown") or answered 4xx/5xx. */
export const isFailedRequest = (request: NetworkRequest): boolean => {
  if (request.status === UNKNOWN_STATUS && isResourceTimingType(request.type)) {
    return false;
  }
  return isErrorStatus(request.status);
};
