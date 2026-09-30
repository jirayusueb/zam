import { WEB_URL } from "../config/env";

export const webPageUrl = (path: string): string => new URL(path, WEB_URL).href;

export const openWebPage = (path: string): void => {
  browser.tabs.create({ url: webPageUrl(path) });
};
