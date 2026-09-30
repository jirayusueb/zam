import type { QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import {
  createRootRouteWithContext,
  HeadContent,
  Outlet,
  Scripts,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { Toaster } from "@zam/ui/components/sonner";
import { TooltipProvider } from "@zam/ui/components/tooltip";
import { MotionConfig } from "motion/react";

import type { orpc } from "@/shared/api/orpc";
import { Header } from "@/widgets/header";

import appCss from "../app/styles/index.css?url";

export interface RouterAppContext {
  orpc: typeof orpc;
  queryClient: QueryClient;
}

const RootDocument = () => (
  <html lang="en">
    <head>
      <HeadContent />
    </head>
    <body>
      {/* Honour the OS reduced-motion setting for every motion animation (animated icons, report wall). */}
      <MotionConfig reducedMotion="user">
        <TooltipProvider>
          <div className="flex min-h-svh flex-col">
            <Header />
            {/* Route content is the "page" view-transition layer; the header stays in root and holds still. */}
            <div className="flex flex-1 flex-col [view-transition-name:page]">
              <Outlet />
            </div>
          </div>
          <Toaster richColors />
        </TooltipProvider>
      </MotionConfig>
      <TanStackRouterDevtools position="bottom-left" />
      <ReactQueryDevtools buttonPosition="bottom-right" position="bottom" />
      <Scripts />
    </body>
  </html>
);

export const Route = createRootRouteWithContext<RouterAppContext>()({
  component: RootDocument,
  head: () => ({
    links: [
      {
        href: appCss,
        rel: "stylesheet",
      },
      { href: "/favicon.ico", rel: "icon", sizes: "48x48" },
      { href: "/favicon.svg", rel: "icon", type: "image/svg+xml" },
      { href: "/apple-touch-icon.png", rel: "apple-touch-icon" },
      { href: "/site.webmanifest", rel: "manifest" },
    ],
    meta: [
      {
        charSet: "utf-8",
      },
      {
        content: "width=device-width, initial-scale=1",
        name: "viewport",
      },
      {
        title: "Zam: one link for the whole bug",
      },
      {
        content:
          "Record your screen once. Engineers get the video, console and network requests in one link. Videos stay in your Google Drive.",
        name: "description",
      },
      {
        content: "#f0f0ee",
        media: "(prefers-color-scheme: light)",
        name: "theme-color",
      },
      {
        content: "#161616",
        media: "(prefers-color-scheme: dark)",
        name: "theme-color",
      },
      { content: "website", property: "og:type" },
      { content: "Zam", property: "og:site_name" },
      { content: "Zam: one link for the whole bug", property: "og:title" },
      {
        content:
          "Video, console and network requests from the moment it broke. Videos stay in your Google Drive.",
        property: "og:description",
      },
      // ponytail: relative URL; make absolute once the production origin is fixed (X/Twitter requires absolute).
      { content: "/og.png", property: "og:image" },
      { content: "1200", property: "og:image:width" },
      { content: "630", property: "og:image:height" },
      {
        content: "Zam: one link. The whole bug.",
        property: "og:image:alt",
      },
      { content: "summary_large_image", name: "twitter:card" },
      { content: "/og.png", name: "twitter:image" },
    ],
  }),
});
