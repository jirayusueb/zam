import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { ConnectDrivePage } from "@/pages/connect-drive";
import { isSameOriginPath } from "@/shared/lib/drive-access-path";

const connectDriveSearchSchema = z.object({
  // Where to continue once Drive access is confirmed; foreign URLs are dropped (open-redirect guard).
  next: z
    .string()
    .optional()
    .transform((path) => (path && isSameOriginPath(path) ? path : undefined)),
});

const ConnectDriveRoute = () => {
  const { next } = Route.useSearch();
  return <ConnectDrivePage next={next} />;
};

// Top-level, not under /_public (redirects signed-in users) or /_private (the
// extension opens this before the reporter may be signed in). Every Google
// sign-in lands here (see driveAccessPath).
export const Route = createFileRoute("/connect-drive")({
  component: ConnectDriveRoute,
  head: () => ({
    meta: [{ title: "Allow Google Drive access · Zam" }],
  }),
  validateSearch: connectDriveSearchSchema,
});
