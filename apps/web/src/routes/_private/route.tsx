import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { getViewer } from "@/entities/viewer";

/** Private zone: signed-in only. Guests go to /login and come back here after. */
export const Route = createFileRoute("/_private")({
  beforeLoad: async ({ location }) => {
    const session = await getViewer();
    if (!session) {
      throw redirect({ search: { redirect: location.href }, to: "/login" });
    }
    return { session };
  },
  component: Outlet,
});
