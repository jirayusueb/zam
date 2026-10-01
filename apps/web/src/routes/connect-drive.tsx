import { createFileRoute } from "@tanstack/react-router";

import { ConnectDrivePage } from "@/pages/connect-drive";

// Top-level, not under /_public (redirects signed-in users) or /_private (the
// extension opens this before the reporter may be signed in).
export const Route = createFileRoute("/connect-drive")({
  component: ConnectDrivePage,
  head: () => ({
    meta: [{ title: "Allow Google Drive access · Zam" }],
  }),
});
