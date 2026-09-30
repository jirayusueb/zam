import { WEB_URL } from "../config/env";

export const openWebPage = (path: string): void => {
  browser.tabs.create({ url: new URL(path, WEB_URL).href });
};
