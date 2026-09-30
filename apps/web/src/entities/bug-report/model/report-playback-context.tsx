import type { MediaPlayerInstance } from "@vidstack/react";
import {
  createContext,
  use,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode, RefObject } from "react";

const MS_PER_SECOND = 1000;

interface ReportPlaybackValue {
  durationMs: number;
  playerRef: RefObject<MediaPlayerInstance | null>;
  playheadMs: number;
  /** Moves the video and the playhead together (devtools row click). */
  seek: (offsetMs: number) => void;
  /** Follows the video as it plays; does not move it. */
  syncPlayhead: (offsetMs: number) => void;
  startedAt: Date;
}

const ReportPlaybackContext = createContext<ReportPlaybackValue | null>(null);

export const ReportPlaybackProvider = ({
  children,
  durationMs,
  startedAt,
}: {
  children: ReactNode;
  durationMs: number;
  startedAt: Date;
}) => {
  const playerRef = useRef<MediaPlayerInstance>(null);
  const [playheadMs, setPlayheadMs] = useState(0);

  const seek = useCallback((offsetMs: number) => {
    setPlayheadMs(offsetMs);
    if (playerRef.current) {
      playerRef.current.currentTime = offsetMs / MS_PER_SECOND;
    }
  }, []);

  const value = useMemo(
    () => ({
      durationMs,
      playerRef,
      playheadMs,
      seek,
      startedAt,
      syncPlayhead: setPlayheadMs,
    }),
    [durationMs, playheadMs, seek, startedAt]
  );

  return (
    <ReportPlaybackContext value={value}>{children}</ReportPlaybackContext>
  );
};

export const useReportPlayback = (): ReportPlaybackValue => {
  const value = use(ReportPlaybackContext);
  if (!value) {
    throw new Error(
      "ReportPlayback parts must render inside ReportPlayback.Provider"
    );
  }
  return value;
};
