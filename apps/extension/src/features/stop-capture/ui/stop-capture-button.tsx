import { Button } from "@zam/ui/components/button";

import { sendExtensionMessage } from "@/shared/api/messages";

export const StopCaptureButton = () => (
  <Button
    variant="destructive"
    onClick={() => {
      void sendExtensionMessage({ type: "capture:stop" });
    }}
  >
    Stop recording
  </Button>
);
