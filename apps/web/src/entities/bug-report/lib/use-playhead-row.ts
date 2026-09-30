import { useEffect } from "react";
import { useListRef } from "react-window";

// Entries must be sorted by timestamp. Active row = last entry at or before the playhead.
export const usePlayheadRow = (
  entries: readonly { timestamp: number }[],
  playheadAtMs: number
) => {
  const listRef = useListRef(null);

  let activeIndex = -1;
  for (const [index, entry] of entries.entries()) {
    if (entry.timestamp > playheadAtMs) {
      break;
    }
    activeIndex = index;
  }

  useEffect(() => {
    if (activeIndex >= 0) {
      listRef.current?.scrollToRow({ align: "smart", index: activeIndex });
    }
  }, [activeIndex, listRef]);

  return { activeIndex, listRef };
};
