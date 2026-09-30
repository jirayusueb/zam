import type { Session } from "@zam/auth";
import type { CaptureUseCases } from "@zam/capture/application/capture-use-cases";

export interface Context {
  session: Session | null;
  capture: CaptureUseCases;
}
