import { createFileRoute } from "@tanstack/react-router";

import { PrivacyPolicyPage } from "@/pages/privacy-policy";

// Top-level, not under /_public: that zone redirects signed-in visitors away.
export const Route = createFileRoute("/privacy-policy")({
  component: PrivacyPolicyPage,
  head: () => ({
    meta: [
      { title: "Privacy policy · Zam" },
      {
        content:
          "What Zam stores, what stays in your Google Drive, and how to delete your data.",
        name: "description",
      },
    ],
  }),
});
