import { Badge } from "@zam/ui/components/badge";
import { useEffect, useState } from "react";

interface CaptureStatusProps {
  startedAt: number;
}

export const CaptureStatus = ({ startedAt }: CaptureStatusProps) => {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const elapsedSeconds = Math.max(0, Math.floor((now - startedAt) / 1000));
  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = elapsedSeconds % 60;

  return (
    <Badge variant="destructive">
      REC {minutes}:{seconds.toString().padStart(2, "0")}
    </Badge>
  );
};
