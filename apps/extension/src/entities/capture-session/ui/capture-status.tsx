import { useNow } from "@shined/react-use";
import { Badge } from "@zam/ui/components/badge";

const TICK_MS = 1000;

interface CaptureStatusProps {
  startedAt: number;
}

export const CaptureStatus = ({ startedAt }: CaptureStatusProps) => {
  const now = useNow({ interval: TICK_MS }).getTime();

  const elapsedSeconds = Math.max(0, Math.floor((now - startedAt) / TICK_MS));
  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = elapsedSeconds % 60;

  return (
    <Badge variant="destructive">
      REC {minutes}:{seconds.toString().padStart(2, "0")}
    </Badge>
  );
};
