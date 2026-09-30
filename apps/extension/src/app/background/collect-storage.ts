import type {
  CookieSameSite,
  StorageItem,
  StorageSnapshot,
  StoredCookie,
} from "@zam/capture/domain/value-objects/storage-snapshot";
import {
  EMPTY_STORAGE_SNAPSHOT,
  redactStorageSnapshot,
} from "@zam/capture/domain/value-objects/storage-snapshot";
import type { Browser } from "wxt/browser";

const MS_PER_SECOND = 1000;

// Injected into the tab; must be self-contained.
const readWebStorage = () => {
  // Injected funcs are serialized alone; hoisting this would break injection.
  // oxlint-disable-next-line unicorn/consistent-function-scoping
  const entries = (storage: Storage) =>
    Object.keys(storage).map((key) => ({
      key,
      value: storage.getItem(key) ?? "",
    }));
  return {
    localStorage: entries(localStorage),
    sessionStorage: entries(sessionStorage),
  };
};

const toSameSite = (sameSite: string | undefined): CookieSameSite => {
  switch (sameSite) {
    case "no_restriction": {
      return "none";
    }
    case "lax":
    case "strict": {
      return sameSite;
    }
    default: {
      return "unspecified";
    }
  }
};

const toStoredCookie = (cookie: Browser.cookies.Cookie): StoredCookie => ({
  domain: cookie.domain,
  expiresAt:
    cookie.expirationDate === undefined
      ? null
      : Math.round(cookie.expirationDate * MS_PER_SECOND),
  httpOnly: cookie.httpOnly,
  name: cookie.name,
  path: cookie.path,
  sameSite: toSameSite(cookie.sameSite),
  secure: cookie.secure,
  value: cookie.value,
});

const collectWebStorage = async (
  tabId: number
): Promise<Pick<StorageSnapshot, "localStorage" | "sessionStorage">> => {
  try {
    const [injection] = await browser.scripting.executeScript({
      func: readWebStorage,
      target: { tabId },
    });
    const result = injection?.result as
      | { localStorage: StorageItem[]; sessionStorage: StorageItem[] }
      | undefined;
    return result ?? EMPTY_STORAGE_SNAPSHOT;
  } catch {
    // Restricted pages (chrome://, store) and storage-denied frames.
    return EMPTY_STORAGE_SNAPSHOT;
  }
};

const collectCookies = async (tabId: number): Promise<StoredCookie[]> => {
  try {
    const { url } = await browser.tabs.get(tabId);
    if (!url) {
      return [];
    }
    const cookies = await browser.cookies.getAll({ url });
    return cookies.map(toStoredCookie);
  } catch {
    return [];
  }
};

/** Application storage of the tab's top frame at stop time, redacted before it leaves the browser. */
export const collectStorage = async (
  tabId: number
): Promise<StorageSnapshot> => {
  const [webStorage, cookies] = await Promise.all([
    collectWebStorage(tabId),
    collectCookies(tabId),
  ]);
  return redactStorageSnapshot({ cookies, ...webStorage });
};
