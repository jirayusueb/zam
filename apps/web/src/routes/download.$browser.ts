import { createFileRoute } from "@tanstack/react-router";

import {
  EXTENSION_RELEASES_URL,
  isExtensionBrowser,
} from "@/shared/config/extension";

const LATEST_RELEASE_API =
  "https://api.github.com/repos/jirayusueb/zam/releases/latest";
// ponytail: unauthenticated GitHub API (60 req/h per worker IP), softened by the
// edge cache below; use a token or a KV-cached asset map if downloads outgrow it.
const RELEASE_CACHE_SECONDS = 300;

interface ReleaseAsset {
  name: string;
  browser_download_url: string;
}

const latestAssetUrl = async (browser: string): Promise<string | null> => {
  try {
    const response = await fetch(LATEST_RELEASE_API, {
      cf: { cacheEverything: true, cacheTtl: RELEASE_CACHE_SECONDS },
      headers: {
        accept: "application/vnd.github+json",
        "user-agent": "zam-web",
      },
    } as RequestInit);
    if (!response.ok) {
      return null;
    }
    const release = (await response.json()) as { assets?: ReleaseAsset[] };
    return (
      release.assets?.find((asset) => asset.name.endsWith(`-${browser}.zip`))
        ?.browser_download_url ?? null
    );
  } catch {
    return null;
  }
};

/** `/download/chrome` | `/download/firefox`: 302 to the latest release zip, else the releases page. */
export const Route = createFileRoute("/download/$browser")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        if (!isExtensionBrowser(params.browser)) {
          return new Response("Unknown browser", { status: 404 });
        }
        const url =
          (await latestAssetUrl(params.browser)) ?? EXTENSION_RELEASES_URL;
        return Response.redirect(url, 302);
      },
    },
  },
});
