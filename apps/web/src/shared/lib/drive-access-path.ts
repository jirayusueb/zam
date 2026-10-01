// Same-origin paths only: "//evil.com" and "/\evil.com" are protocol-relative in browsers.
const SAME_ORIGIN_PATH = /^\/(?![/\\])/u;

export const isSameOriginPath = (path: string): boolean =>
  SAME_ORIGIN_PATH.test(path);

/**
 * Every Google sign-in lands on /connect-drive first: it continues to `next`
 * once Drive access is granted and otherwise asks for it (publishing needs it).
 */
export const driveAccessPath = (next: string): string =>
  `/connect-drive?next=${encodeURIComponent(isSameOriginPath(next) ? next : "/dashboard")}`;
