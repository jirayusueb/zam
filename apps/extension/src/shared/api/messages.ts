import type { DevtoolsSnapshot } from "@zam/capture/domain/value-objects/devtools-snapshot";

export type ExtensionMessage =
  | { type: "capture:start" }
  | { type: "capture:stop" }
  | { type: "recorder:start" }
  | { type: "recorder:stop" }
  | { type: "recorder:started"; startedAt: number }
  | { type: "recorder:cancelled" }
  | { type: "recorder:stopped"; durationMs: number }
  | { type: "report:published"; reportId: string }
  | { type: "report:failed"; message: string; reportId: string | null };

export interface CaptureContext {
  title: string;
  pageUrl: string | null;
  startedAt: number;
  devtools: DevtoolsSnapshot;
}

const MESSAGE_TYPE_SET: Record<ExtensionMessage["type"], true> = {
  "capture:start": true,
  "capture:stop": true,
  "recorder:cancelled": true,
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
