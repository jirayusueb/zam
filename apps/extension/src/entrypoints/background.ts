import { registerCaptureController } from "@/app/background/capture-controller";

export default defineBackground(() => {
  registerCaptureController();
});
