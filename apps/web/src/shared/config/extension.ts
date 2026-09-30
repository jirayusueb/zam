/** The extension ships as zips on GitHub releases (see .github/workflows/release-extension.yml); no store listing yet. */
export const EXTENSION_RELEASES_URL =
  "https://github.com/jirayusueb/zam/releases/latest";

export const EXTENSION_BROWSERS = ["chrome", "firefox"] as const;
export type ExtensionBrowser = (typeof EXTENSION_BROWSERS)[number];

export const isExtensionBrowser = (value: string): value is ExtensionBrowser =>
  (EXTENSION_BROWSERS as readonly string[]).includes(value);

/** Served by `routes/download.$browser.ts`: redirects to the latest release zip. */
export const extensionDownloadPath = (browser: ExtensionBrowser): string =>
  `/download/${browser}`;
