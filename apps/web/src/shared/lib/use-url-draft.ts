import { useDebouncedFn } from "@shined/react-use";
import { useEffect, useRef, useState } from "react";

const DEBOUNCE_MS = 250;

/**
 * Local draft for a text input whose committed value lives in the URL: types
 * update the field instantly, the commit callback fires 250ms after the user
 * stops typing, and external changes (back/forward) resync the draft.
 */
export const useUrlDraft = (
  value: string,
  onCommit: (next: string) => void
) => {
  const [draft, setDraft] = useState(value);
  const lastCommitted = useRef(value);
  const debouncedCommit = useDebouncedFn(
    (next: string) => {
      lastCommitted.current = next;
      onCommit(next);
    },
    { wait: DEBOUNCE_MS }
  );

  useEffect(() => {
    if (value !== lastCommitted.current) {
      lastCommitted.current = value;
      setDraft(value);
    }
  }, [value]);

  const onChange = (next: string) => {
    setDraft(next);
    debouncedCommit(next);
  };

  return [draft, onChange] as const;
};
