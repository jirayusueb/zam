import { isResourceTimingType } from "@zam/capture/domain/value-objects/devtools-snapshot";
import type { NetworkResourceType } from "@zam/capture/domain/value-objects/devtools-snapshot";

const FAILED_STATUS = 0;
const ERROR_STATUS_THRESHOLD = 400;

export const isErrorStatus = (status: number): boolean =>
  status === FAILED_STATUS || status >= ERROR_STATUS_THRESHOLD;

/** Resource-timing types (script, image, …) report status 0 for "not exposed", not "failed". */
export const statusLabel = (
  status: number,
  type?: NetworkResourceType
): string => {
  if (status === FAILED_STATUS) {
    return isResourceTimingType(type) ? "—" : "failed";
  }
  return String(status);
};

/** The path portion of a request URL for compact display; falls back to the raw value. */
export const networkEndpoint = (url: string): string => {
  try {
    return new URL(url).pathname || "/";
  } catch {
    return url;
  }
};
