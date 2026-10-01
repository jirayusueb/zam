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
  | {
      status: "editing";
      target: CaptureTarget;
      startedAt: number;
      /** Null until the offscreen recorder has the recording ready and the editor tab is open. */
      editorTabId: number | null;
    }
  | {
      status: "publishing";
      target: CaptureTarget;
      startedAt: number;
      editorTabId: number | null;
    };

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

export const beginEditing = (session: CaptureSession): CaptureSession => {
  if (session.status !== "recording") {
    return session;
  }
  return {
    editorTabId: null,
    startedAt: session.startedAt,
    status: "editing",
    target: session.target,
  };
};

export const attachEditor = (
  session: CaptureSession,
  editorTabId: number
): CaptureSession => {
  if (session.status !== "editing") {
    return session;
  }
  return { ...session, editorTabId };
};

export const beginPublishing = (session: CaptureSession): CaptureSession => {
  if (session.status !== "editing") {
    return session;
  }
  return { ...session, status: "publishing" };
};

/** A publish stopped before anything was saved (e.g. Drive access missing): the recording stays editable. */
export const resumeEditing = (session: CaptureSession): CaptureSession => {
  if (session.status !== "publishing") {
    return session;
  }
  return { ...session, status: "editing" };
};

/** The editor tab of an in-flight edit or upload, if any. */
export const editorTabOf = (session: CaptureSession): number | null =>
  session.status === "editing" || session.status === "publishing"
    ? session.editorTabId
    : null;

export const finishCapture = (
  session: CaptureSession,
  outcome: CaptureOutcome | null
): CaptureSession => {
  if (session.status === "idle") {
    return session;
  }
  return { lastOutcome: outcome, status: "idle" };
};
