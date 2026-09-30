import { storage } from "wxt/utils/storage";

export type CaptureOutcome =
  | { kind: "published"; reportId: string }
  | { kind: "failed"; message: string; reportId: string | null };

export interface CaptureTarget {
  tabId: number;
  title: string;
  pageUrl: string | null;
}

export type CaptureSession =
  | { status: "idle"; lastOutcome: CaptureOutcome | null }
  | { status: "selecting"; target: CaptureTarget }
  | { status: "recording"; target: CaptureTarget; startedAt: number }
  | { status: "publishing"; target: CaptureTarget; startedAt: number };

export const captureSessionItem = storage.defineItem<CaptureSession>(
  "session:captureSession",
  {
    fallback: { lastOutcome: null, status: "idle" },
  }
);

export const beginSelecting = (target: CaptureTarget): CaptureSession => ({
  status: "selecting",
  target,
});

export const beginRecording = (
  session: CaptureSession,
  startedAt: number
): CaptureSession => {
  if (session.status !== "selecting") {
    return session;
  }
  return { startedAt, status: "recording", target: session.target };
};

export const beginPublishing = (session: CaptureSession): CaptureSession => {
  if (session.status !== "recording") {
    return session;
  }
  return {
    startedAt: session.startedAt,
    status: "publishing",
    target: session.target,
  };
};

export const finishCapture = (
  session: CaptureSession,
  outcome: CaptureOutcome | null
): CaptureSession => {
  if (session.status === "idle") {
    return session;
  }
  return { lastOutcome: outcome, status: "idle" };
};
