import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { z } from "zod";

import { getViewer } from "@/entities/viewer";

// Same-origin paths only: "//evil.com" and "/\evil.com" are protocol-relative in browsers.
const SAME_ORIGIN_PATH = /^\/(?![/\\])/u;

const publicSearchSchema = z.object({
  // Anything else is dropped, not rejected, so a tampered link still reaches sign-in.
  redirect: z
    .string()
    .optional()
    .transform((path) =>
      path && SAME_ORIGIN_PATH.test(path) ? path : undefined
    ),
});

/** Public zone: guests only (sign-in). Signed-in visitors skip ahead to where they were going. */
export const Route = createFileRoute("/_public")({
  beforeLoad: async ({ search }) => {
    const session = await getViewer();
    if (session) {
      throw redirect({ href: search.redirect ?? "/dashboard" });
    }
  },
  component: Outlet,
  validateSearch: publicSearchSchema,
});
