const FAILED_STATUS = 0;
const ERROR_STATUS_THRESHOLD = 400;

export const isErrorStatus = (status: number): boolean =>
  status === FAILED_STATUS || status >= ERROR_STATUS_THRESHOLD;

export const statusLabel = (status: number): string =>
  status === FAILED_STATUS ? "failed" : String(status);

/** The path portion of a request URL for compact display; falls back to the raw value. */
export const networkEndpoint = (url: string): string => {
  try {
    return new URL(url).pathname || "/";
  } catch {
    return url;
  }
};
