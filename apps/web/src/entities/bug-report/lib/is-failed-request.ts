import type { NetworkRequest } from "@zam/capture/domain/value-objects/devtools-snapshot";

const FAILED_STATUS = 0;
const ERROR_STATUS_THRESHOLD = 400;

/** A request that never completed (status 0) or answered 4xx/5xx. */
export const isFailedRequest = (request: NetworkRequest): boolean =>
  request.status === FAILED_STATUS || request.status >= ERROR_STATUS_THRESHOLD;
