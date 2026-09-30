import { MediaPlayer, MediaProvider } from "@vidstack/react";
import {
  DefaultVideoLayout,
  defaultLayoutIcons,
} from "@vidstack/react/player/layouts/default";
import { VIDEO_MIME_TYPE } from "@zam/capture/domain/value-objects/video-recording";
import { Alert, AlertTitle } from "@zam/ui/components/alert";

import { useReportPlayback } from "../model/report-playback-context";

const MS_PER_SECOND = 1000;

export const ReportVideo = ({
  src,
  title,
}: {
  src: string | null;
  title: string;
}) => {
  const { durationMs, playerRef, syncPlayhead } = useReportPlayback();

  if (!src) {
    return (
      <Alert>
        <AlertTitle>Video was not uploaded</AlertTitle>
      </Alert>
    );
  }

  return (
    <MediaPlayer
      // Known up front: older uploads lack WebM duration metadata.
      duration={durationMs / MS_PER_SECOND}
      onTimeUpdate={({ currentTime }) =>
        syncPlayhead(currentTime * MS_PER_SECOND)
      }
      playsInline
      ref={playerRef}
      // The URL has no file extension, so Vidstack needs the MIME type to pick the video provider.
      src={{ src, type: VIDEO_MIME_TYPE }}
      title={title}
    >
      <MediaProvider />
      <DefaultVideoLayout icons={defaultLayoutIcons} />
    </MediaPlayer>
  );
};
