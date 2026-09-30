import { createFileRoute } from "@tanstack/react-router";

import { InstallExtensionPage } from "@/pages/install-extension";

// Top-level, not under /_public: that zone redirects signed-in visitors away.
export const Route = createFileRoute("/docs/install-extension")({
  component: InstallExtensionPage,
  head: () => ({
    meta: [
      { title: "Install the extension · Zam" },
      {
        content:
          "Download the Zam extension, load it in Chrome or Firefox, sign in, and record your first bug report.",
        name: "description",
      },
    ],
  }),
});
