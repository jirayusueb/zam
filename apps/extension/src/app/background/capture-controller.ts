import { EMPTY_STORAGE_SNAPSHOT } from "@zam/capture/domain/value-objects/storage-snapshot";
import { MAX_TITLE_LENGTH } from "@zam/capture/domain/value-objects/title";

import {
  attachEditor,
  beginEditing,
  beginPublishing,
  beginRecording,
  beginSelecting,
  captureSessionItem,
  editorTabOf,
  finishCapture,
} from "@/entities/capture-session";
import type { CaptureOutcome, CaptureTarget } from "@/entities/capture-session";
import { isExtensionMessage } from "@/shared/api/messages";
import type { CaptureContext, ExtensionMessage } from "@/shared/api/messages";
import { openWebPage, webPageUrl } from "@/shared/lib/open-web-page";

import { collectDevtools, EMPTY_PAGE_BUFFER } from "./collect-devtools";
import { collectEnvironment } from "./collect-environment";
import { collectStorage } from "./collect-storage";

const OFFSCREEN_URL = "/offscreen.html";
const EDITOR_PATH = "/editor.html";

const REC_BADGE_COLOR = "#dc2626";

const ensureOffscreenDocument = async (): Promise<void> => {
  const existing = await browser.runtime.getContexts({
    contextTypes: ["OFFSCREEN_DOCUMENT"],
  });
  if (existing.length > 0) {
    return;
  }
  await browser.offscreen.createDocument({
    justification: "Record the screen, window, or tab you choose",
    reasons: ["DISPLAY_MEDIA"],
    url: OFFSCREEN_URL,
  });
};

const closeOffscreenDocument = async (): Promise<void> => {
  const existing = await browser.runtime.getContexts({
    contextTypes: ["OFFSCREEN_DOCUMENT"],
  });
  if (existing.length > 0) {
    await browser.offscreen.closeDocument();
  }
};

const setBadgeRecording = async (): Promise<void> => {
  await browser.action.setBadgeBackgroundColor({ color: REC_BADGE_COLOR });
  await browser.action.setBadgeText({ text: "REC" });
};

const setBadgeEditing = async (): Promise<void> => {
  await browser.action.setBadgeText({ text: "EDIT" });
};

const setBadgePublishing = async (): Promise<void> => {
  await browser.action.setBadgeText({ text: "…" });
};

const clearBadge = async (): Promise<void> => {
  await browser.action.setBadgeText({ text: "" });
};

const resolveTarget = async (): Promise<CaptureTarget | null> => {
  const [tab] = await browser.tabs.query({
    active: true,
    lastFocusedWindow: true,
  });
  if (!tab?.id) {
    return null;
  }
  const rawTitle =
    tab.title ||
    (tab.url ? new URL(tab.url).hostname : "") ||
    "Untitled capture";
  const pageUrl =
    tab.url && /^https?:$/u.test(new URL(tab.url).protocol) ? tab.url : null;
  return {
    pageUrl,
    tabId: tab.id,
    title: rawTitle.slice(0, MAX_TITLE_LENGTH),
  };
};

const handleCaptureStart = async (): Promise<void> => {
  const session = await captureSessionItem.getValue();
  if (session.status !== "idle") {
    return;
  }
  const target = await resolveTarget();
  if (!target) {
    // finishCapture ignores idle sessions, so record the outcome directly.
    await captureSessionItem.setValue({
      lastOutcome: {
        kind: "failed",
        message: "No active tab to capture",
        reportId: null,
      },
      status: "idle",
    });
    return;
  }
  const selecting = beginSelecting(target);
  await captureSessionItem.setValue(selecting);
  try {
    await ensureOffscreenDocument();
    await browser.runtime.sendMessage({
      type: "recorder:start",
    } satisfies ExtensionMessage);
  } catch (error) {
    // Otherwise the session stays "selecting" and blocks every later capture.
    await captureSessionItem.setValue(
      finishCapture(selecting, {
        kind: "failed",
        message:
          error instanceof Error
            ? error.message
            : "Could not start the recorder",
        reportId: null,
      })
    );
  }
};

const handleRecorderStarted = async (startedAt: number): Promise<void> => {
  const session = await captureSessionItem.getValue();
  await captureSessionItem.setValue(beginRecording(session, startedAt));
  await setBadgeRecording();
};

const handleRecorderCancelled = async (): Promise<void> => {
  const session = await captureSessionItem.getValue();
  await captureSessionItem.setValue(finishCapture(session, null));
  await clearBadge();
  await closeOffscreenDocument();
};

const handleCaptureStop = async (): Promise<void> => {
  await browser.runtime.sendMessage({
    type: "recorder:stop",
  } satisfies ExtensionMessage);
};

const handleRecorderStopped = async (
  durationMs: number
): Promise<CaptureContext> => {
  const session = await captureSessionItem.getValue();
  await captureSessionItem.setValue(beginEditing(session));
  await setBadgeEditing();

  const target = session.status === "recording" ? session.target : null;
  const startedAt =
    session.status === "recording"
      ? session.startedAt
      : Date.now() - durationMs;
  const { devtools, steps, metadata } = target
    ? await collectDevtools(target.tabId, startedAt, startedAt + durationMs)
    : EMPTY_PAGE_BUFFER;
  const storage = target
    ? await collectStorage(target.tabId)
    : EMPTY_STORAGE_SNAPSHOT;
  const environment = target ? await collectEnvironment(target.tabId) : null;

  return {
    devtools,
    environment,
    metadata,
    pageUrl: target?.pageUrl ?? null,
    startedAt,
    steps,
    storage,
    title: target?.title ?? "Untitled capture",
  };
};

const handleRecorderReady = async (): Promise<void> => {
  const tab = await browser.tabs.create({
    url: browser.runtime.getURL(EDITOR_PATH),
  });
  if (tab.id !== undefined) {
    const session = await captureSessionItem.getValue();
    await captureSessionItem.setValue(attachEditor(session, tab.id));
  }
};

const handleEditorPublishing = async (): Promise<void> => {
  const session = await captureSessionItem.getValue();
  await captureSessionItem.setValue(beginPublishing(session));
  await setBadgePublishing();
};

/** Ends the capture and releases the offscreen document, which holds the recording. */
const endCapture = async (outcome: CaptureOutcome | null): Promise<void> => {
  const session = await captureSessionItem.getValue();
  await captureSessionItem.setValue(finishCapture(session, outcome));
  await clearBadge();
  await closeOffscreenDocument();
};

const handleReportPublished = async (reportId: string): Promise<void> => {
  const editorTabId = editorTabOf(await captureSessionItem.getValue());
  await endCapture({ kind: "published", reportId });
  const path = `/r/${reportId}`;
  if (editorTabId === null) {
    openWebPage(path);
    return;
  }
  // The editor tab becomes the report, so publishing leaves no stale tab behind.
  await browser.tabs.update(editorTabId, { url: webPageUrl(path) });
};

const handleCaptureDiscard = async (): Promise<void> => {
  const editorTabId = editorTabOf(await captureSessionItem.getValue());
  await endCapture(null);
  if (editorTabId !== null) {
    await browser.tabs.remove(editorTabId).catch(() => {
      // Already closed.
    });
  }
};

const handleTabRemoved = async (tabId: number): Promise<void> => {
  const session = await captureSessionItem.getValue();
  if (editorTabOf(session) !== tabId) {
    return;
  }
  // Closing the editor discards the recording; mid-upload it also aborts the publish.
  await endCapture(
    session.status === "publishing"
      ? {
          kind: "failed",
          message: "The editor tab was closed before the upload finished",
          reportId: null,
        }
      : null
  );
};

export const registerCaptureController = (): void => {
  browser.tabs.onRemoved.addListener((tabId) => {
    void handleTabRemoved(tabId);
  });

  browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!isExtensionMessage(message)) {
      return;
    }

    if (message.type === "recorder:stopped") {
      void (async () => {
        const context = await handleRecorderStopped(message.durationMs);
        sendResponse(context);
      })();
      return true;
    }

    switch (message.type) {
      case "capture:start": {
        void handleCaptureStart();
        break;
      }
      case "capture:stop": {
        void handleCaptureStop();
        break;
      }
      case "capture:discard": {
        void handleCaptureDiscard();
        break;
      }
      case "recorder:ready": {
        void handleRecorderReady();
        break;
      }
      case "editor:publishing": {
        void handleEditorPublishing();
        break;
      }
      case "recorder:started": {
        void handleRecorderStarted(message.startedAt);
        break;
      }
      case "recorder:cancelled": {
        void handleRecorderCancelled();
        break;
      }
      case "report:published": {
        void handleReportPublished(message.reportId);
        break;
      }
      case "report:failed": {
        void endCapture({
          kind: "failed",
          message: message.message,
          reportId: message.reportId,
        });
        break;
      }
      default: {
        break;
      }
    }
  });
};
