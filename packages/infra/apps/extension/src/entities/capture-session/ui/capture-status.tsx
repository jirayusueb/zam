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
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5">
        <span className="relative flex size-2">
          <span className="bg-destructive absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 motion-reduce:animate-none" />
          <span className="bg-destructive relative inline-flex size-2 rounded-full" />
        </span>
        <span className="text-muted-foreground text-xs">Recording</span>
      </div>
      <span className="font-mono text-3xl tabular-nums">
        {minutes}:{seconds.toString().padStart(2, "0")}
      </span>
    </div>
  );
};
