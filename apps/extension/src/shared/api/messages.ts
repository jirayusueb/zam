import type { ClientEnvironment } from "@zam/capture/domain/value-objects/client-environment";
import type { DevtoolsSnapshot } from "@zam/capture/domain/value-objects/devtools-snapshot";
import type { StorageSnapshot } from "@zam/capture/domain/value-objects/storage-snapshot";
import type { UserStep } from "@zam/capture/domain/value-objects/user-step";

export type ExtensionMessage =
  | { type: "capture:start" }
  | { type: "capture:stop" }
  | { type: "capture:discard" }
  | { type: "recorder:start" }
  | { type: "recorder:stop" }
  | { type: "recorder:started"; startedAt: number }
  | { type: "recorder:cancelled" }
  | { type: "recorder:stopped"; durationMs: number }
  | { type: "recorder:ready" }
  | { type: "editor:load" }
  | { type: "editor:publishing" }
  | { type: "editor:publish-blocked" }
  | { type: "report:published"; reportId: string }
  | { type: "report:failed"; message: string; reportId: string | null };

export interface CaptureContext {
  title: string;
  pageUrl: string | null;
  startedAt: number;
  // Collected at stop from the recorded tab; see app/background/collect-*.ts.
  devtools: DevtoolsSnapshot;
  storage: StorageSnapshot;
  steps: UserStep[];
  environment: ClientEnvironment | null;
  // Set via `window.zam.setMetadata(...)` in the recorded page, or edited later on the report page.
  metadata: Record<string, string>;
}

/** A finished capture, held by the offscreen document until the editor publishes or discards it. */
export interface PendingRecording {
  /** Blob URL owned by the offscreen document; readable from any extension page while it lives. */
  videoUrl: string;
  durationMs: number;
  context: CaptureContext;
}

const MESSAGE_TYPE_SET: Record<ExtensionMessage["type"], true> = {
  "capture:discard": true,
  "capture:start": true,
  "capture:stop": true,
  "editor:load": true,
  "editor:publish-blocked": true,
  "editor:publishing": true,
  "recorder:cancelled": true,
  "recorder:ready": true,
  "recorder:start": true,
  "recorder:started": true,
  "recorder:stop": true,
  "recorder:stopped": true,
  "report:failed": true,
  "report:published": true,
};

export const isExtensionMessage = (
  value: unknown
): value is ExtensionMessage => {
  if (typeof value !== "object" || value === null || !("type" in value)) {
    return false;
  }
  const { type } = value;
  return typeof type === "string" && type in MESSAGE_TYPE_SET;
};

export const sendExtensionMessage = (
  message: ExtensionMessage
): Promise<unknown> => browser.runtime.sendMessage(message);

export const requestCaptureContext = async (
  durationMs: number
): Promise<CaptureContext> => {
  const response = await sendExtensionMessage({
    durationMs,
    type: "recorder:stopped",
  });
  // recorder:stopped is answered only by the capture controller, which always responds with a CaptureContext
  return response as CaptureContext;
};

export const requestPendingRecording =
  async (): Promise<PendingRecording | null> => {
    const response = await sendExtensionMessage({ type: "editor:load" });
    // editor:load is answered only by the offscreen recorder, with its PendingRecording or null
    return (response ?? null) as PendingRecording | null;
  };
