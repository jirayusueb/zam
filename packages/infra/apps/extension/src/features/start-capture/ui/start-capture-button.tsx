import { Button } from "@zam/ui/components/button";
import { Video } from "lucide-react";

import { sendExtensionMessage } from "@/shared/api/messages";

export const StartCaptureButton = () => (
  <Button
    size="lg"
    className="w-full"
    onClick={() => {
      void sendExtensionMessage({ type: "capture:start" });
    }}
  >
    <Video />
    Start recording
  </Button>
);
