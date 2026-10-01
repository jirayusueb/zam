import type { DevtoolsSnapshot } from "@zam/capture/domain/value-objects/devtools-snapshot";
import type { UserStep } from "@zam/capture/domain/value-objects/user-step";

import { DEVTOOLS_BUFFER_KEY } from "@/entities/devtools-log";

export interface PageBuffer {
  devtools: DevtoolsSnapshot;
  steps: UserStep[];
  metadata: Record<string, string>;
}

export const EMPTY_PAGE_BUFFER: PageBuffer = {
  devtools: { console: [], network: [] },
  metadata: {},
  steps: [],
};

// The injected func runs in the page's isolated MAIN world; it must be fully
// self-contained (no closures over this module's scope).
const readDevtoolsBuffer = (key: string, sinceMs: number, untilMs: number) => {
  const buffer = (
    globalThis as Record<
      symbol,
      | {
          console: unknown[];
          network: unknown[];
          resourceNetwork?: unknown[];
          steps?: unknown[];
          metadata?: Record<string, string>;
        }
      | undefined
    >
  )[Symbol.for(key)];
  if (!buffer) {
    return { console: [], metadata: {}, network: [], steps: [] };
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
    metadata: buffer.metadata ?? {},
    // Fetch/xhr/websocket entries and resource-timing entries are kept in
    // separate bounded buffers so a flood of static assets can't evict
    // already-captured requests; merged here at read time.
    network: [...buffer.network, ...(buffer.resourceNetwork ?? [])].filter(
      isDuringRecording
    ),
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
      metadata:
        typeof result.metadata === "object" && result.metadata !== null
          ? (result.metadata as Record<string, string>)
          : {},
      steps: result.steps as UserStep[],
    };
  } catch {
    return EMPTY_PAGE_BUFFER;
  }
};
