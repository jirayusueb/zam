import type { DevtoolsSnapshot } from "@zam/capture/domain/value-objects/devtools-snapshot";
import type { UserStep } from "@zam/capture/domain/value-objects/user-step";

import { DEVTOOLS_BUFFER_KEY } from "@/entities/devtools-log";

export interface PageBuffer {
  devtools: DevtoolsSnapshot;
  steps: UserStep[];
}

export const EMPTY_PAGE_BUFFER: PageBuffer = {
  devtools: { console: [], network: [] },
  steps: [],
};

// The injected func runs in the page's isolated MAIN world; it must be fully
// self-contained (no closures over this module's scope).
const readDevtoolsBuffer = (key: string, sinceMs: number, untilMs: number) => {
  const buffer = (
    globalThis as Record<
      symbol,
      { console: unknown[]; network: unknown[]; steps?: unknown[] } | undefined
    >
  )[Symbol.for(key)];
  if (!buffer) {
    return { console: [], network: [], steps: [] };
  }
  const isDuringRecording = (entry: unknown) => {
    if (typeof entry !== "object" || entry === null) {
      return false;
    }
    const { timestamp } = entry as { timestamp?: unknown };
    return (
      typeof timestamp === "number" &&
      timestamp >= sinceMs &&
      timestamp <= untilMs
    );
  };
  return {
    console: buffer.console.filter(isDuringRecording),
    network: buffer.network.filter(isDuringRecording),
    // Absent in pages whose hooks were installed by an older extension build.
    steps: (buffer.steps ?? []).filter(isDuringRecording),
  };
};

// ponytail: page-memory buffer only; entries from pages navigated away during
// recording are lost. Persist per tab in storage.session if that matters.
export const collectDevtools = async (
  tabId: number,
  since: number,
  until: number
): Promise<PageBuffer> => {
  try {
    const [injection] = await browser.scripting.executeScript({
      args: [DEVTOOLS_BUFFER_KEY, since, until],
      func: readDevtoolsBuffer,
      target: { tabId },
      world: "MAIN",
    });

    const result = injection?.result;
    if (
      !result ||
      typeof result !== "object" ||
      !Array.isArray(result.console) ||
      !Array.isArray(result.network) ||
      !Array.isArray(result.steps)
    ) {
      return EMPTY_PAGE_BUFFER;
    }
    // Shape checked above; item validation happens server-side via Zod + domain invariants.
    return {
      devtools: {
        console: result.console,
        network: result.network,
      } as DevtoolsSnapshot,
      steps: result.steps as UserStep[],
    };
  } catch {
    return EMPTY_PAGE_BUFFER;
  }
};
