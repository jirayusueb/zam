const webUrl = import.meta.env.WXT_WEB_URL;

if (!webUrl) {
  throw new Error("WXT_WEB_URL is required");
}

export const WEB_URL = webUrl;
