import { Button } from "@zam/ui/components/button";

import { sendExtensionMessage } from "@/shared/api/messages";

export const StopCaptureButton = () => (
  <Button
    variant="destructive"
    size="lg"
    className="bg-destructive hover:bg-destructive/90 w-full text-white"
    onClick={() => {
      void sendExtensionMessage({ type: "capture:stop" });
    }}
  >
    Stop recording
  </Button>
);
