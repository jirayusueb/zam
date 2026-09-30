import { checkRules } from "../../shared/domain-rule";
import { ok } from "../../shared/result";
import type { Result } from "../../shared/result";
import { invalidBugReport } from "../capture-domain-error";
import type { CaptureDomainError } from "../capture-domain-error";

export interface PixelSize {
  width: number;
  height: number;
}

/** The reporter's browser and device when the recording stopped. */
export interface ClientEnvironment {
  /** e.g. `"Chrome 153.0.0.0"`. */
  browser: string;
  /** e.g. `"macOS 15.4"`. */
  os: string;
  userAgent: string;
  /** BCP 47, e.g. `"th-TH"`. */
  language: string;
  /** IANA, e.g. `"Asia/Bangkok"`. */
  timeZone: string;
  viewport: PixelSize;
  screen: PixelSize;
  devicePixelRatio: number;
  /** Network Information API; `null` where unsupported (Firefox, Safari). */
  connection: { effectiveType: string; downlinkMbps: number } | null;
}

export const MAX_ENVIRONMENT_FIELD_LENGTH = 512;

const isPixelSize = (size: PixelSize): boolean =>
  Number.isFinite(size.width) &&
  Number.isFinite(size.height) &&
  size.width >= 0 &&
  size.height >= 0;

export const parseClientEnvironment = (
  environment: ClientEnvironment
): Result<ClientEnvironment, CaptureDomainError> => {
  const texts = [
    environment.browser,
    environment.os,
    environment.userAgent,
    environment.language,
    environment.timeZone,
    environment.connection?.effectiveType ?? "",
  ];
  const checked = checkRules(
    {
      holds: () =>
        texts.every((text) => text.length <= MAX_ENVIRONMENT_FIELD_LENGTH),
      violation: () =>
        invalidBugReport(
          `Environment fields exceed the maximum of ${MAX_ENVIRONMENT_FIELD_LENGTH} characters`
        ),
    },
    {
      holds: () =>
        isPixelSize(environment.viewport) &&
        isPixelSize(environment.screen) &&
        Number.isFinite(environment.devicePixelRatio) &&
        (environment.connection === null ||
          Number.isFinite(environment.connection.downlinkMbps)),
      violation: () =>
        invalidBugReport("Environment sizes and speeds must be finite numbers"),
    }
  );
  return checked.ok ? ok(environment) : checked;
};
