import { useEffect, useState } from "react";

import type { CaptureSession } from "./capture-session";
import { captureSessionItem } from "./capture-session";

export const useCaptureSession = (): CaptureSession | null => {
  const [session, setSession] = useState<CaptureSession | null>(null);

  useEffect(() => {
    let cancelled = false;
    const loadInitialValue = async () => {
      const value = await captureSessionItem.getValue();
      if (!cancelled) {
        setSession(value);
      }
    };
    void loadInitialValue();
    const unwatch = captureSessionItem.watch((value) => {
      setSession(value);
    });
    return () => {
      cancelled = true;
      unwatch();
    };
  }, []);

  return session;
};
