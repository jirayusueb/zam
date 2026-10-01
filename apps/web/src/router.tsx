import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";

import { ErrorPage } from "@/pages/error";
import { NotFoundPage } from "@/pages/not-found";
import { Loader } from "@/shared/ui/loader";

import { routeTree } from "./routeTree.gen";
import { createQueryClient, orpc } from "./shared/api/orpc";

export const getRouter = () => {
  const queryClient = createQueryClient();

  const router = createTanStackRouter({
    context: { orpc, queryClient },
    defaultErrorComponent: ErrorPage,
    defaultNotFoundComponent: NotFoundPage,
    defaultPendingComponent: () => <Loader />,
    defaultPreloadStaleTime: 0,
    // Wraps page navigations in document.startViewTransition (animation in app/styles/index.css).
    // Search-only changes (tabs, filters, selections) skip it: fading the whole page on every click flickers.
    defaultViewTransition: {
      types: ({ pathChanged }) => (pathChanged ? [] : false),
    },
    routeTree,
    scrollRestoration: true,
  });

  setupRouterSsrQueryIntegration({
    queryClient,
    router,
  });

  return router;
};

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
