export type CaptureDomainErrorCode =
  | "INVALID_BUG_REPORT"
  | "BUG_REPORT_NOT_FOUND"
  | "BUG_REPORT_ACCESS_DENIED"
  | "BUG_REPORT_ALREADY_PUBLISHED"
  | "INVALID_COMMENT"
  | "COMMENT_NOT_FOUND";

export class CaptureDomainError extends Error {
  readonly code: CaptureDomainErrorCode;

  constructor(code: CaptureDomainErrorCode, message: string) {
    super(message);
    this.name = "CaptureDomainError";
    this.code = code;
  }
}

export const invalidBugReport = (message: string): CaptureDomainError =>
  new CaptureDomainError("INVALID_BUG_REPORT", message);

export const invalidComment = (message: string): CaptureDomainError =>
  new CaptureDomainError("INVALID_COMMENT", message);
