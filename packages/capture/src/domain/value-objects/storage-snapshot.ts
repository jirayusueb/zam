import { checkRules } from "../../shared/domain-rule";
import type { DomainRule } from "../../shared/domain-rule";
import { ok } from "../../shared/result";
import type { Result } from "../../shared/result";
import { invalidBugReport } from "../capture-domain-error";
import type { CaptureDomainError } from "../capture-domain-error";
import { isSecretName, REDACTED } from "./devtools-snapshot";

export const COOKIE_SAME_SITE = [
  "none",
  "lax",
  "strict",
  "unspecified",
] as const;
export type CookieSameSite = (typeof COOKIE_SAME_SITE)[number];

export interface StoredCookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  /** Epoch ms; `null` = session cookie. */
  expiresAt: number | null;
  httpOnly: boolean;
  secure: boolean;
  sameSite: CookieSameSite;
}

export interface StorageItem {
  key: string;
  value: string;
}

/** The tab's cookies, localStorage and sessionStorage at the moment the recording stopped. */
export interface StorageSnapshot {
  cookies: readonly StoredCookie[];
  localStorage: readonly StorageItem[];
  sessionStorage: readonly StorageItem[];
}

export const EMPTY_STORAGE_SNAPSHOT: StorageSnapshot = {
  cookies: [],
  localStorage: [],
  sessionStorage: [],
};

export const MAX_STORAGE_ENTRIES = 1000;
export const MAX_STORAGE_NAME_LENGTH = 256;
export const MAX_STORAGE_VALUE_LENGTH = 2000;

const redactValue = (name: string, value: string): string =>
  isSecretName(name) ? REDACTED : value.slice(0, MAX_STORAGE_VALUE_LENGTH);

const redactItems = (items: readonly StorageItem[]): StorageItem[] =>
  items.slice(0, MAX_STORAGE_ENTRIES).map(({ key, value }) => ({
    key: key.slice(0, MAX_STORAGE_NAME_LENGTH),
    value: redactValue(key, value),
  }));

/**
 * Applied client-side before storage leaves the browser. HttpOnly cookies are
 * server session credentials, so their values are always redacted.
 */
export const redactStorageSnapshot = (
  snapshot: StorageSnapshot
): StorageSnapshot => ({
  cookies: snapshot.cookies.slice(0, MAX_STORAGE_ENTRIES).map((cookie) => ({
    ...cookie,
    domain: cookie.domain.slice(0, MAX_STORAGE_NAME_LENGTH),
    name: cookie.name.slice(0, MAX_STORAGE_NAME_LENGTH),
    path: cookie.path.slice(0, MAX_STORAGE_NAME_LENGTH),
    value: cookie.httpOnly ? REDACTED : redactValue(cookie.name, cookie.value),
  })),
  localStorage: redactItems(snapshot.localStorage),
  sessionStorage: redactItems(snapshot.sessionStorage),
});

type StorageRule = DomainRule<CaptureDomainError>;

const fitsLimits = (
  label: string,
  names: readonly string[],
  value: string
): StorageRule => ({
  holds: () =>
    value.length <= MAX_STORAGE_VALUE_LENGTH &&
    names.every((name) => name.length <= MAX_STORAGE_NAME_LENGTH),
  violation: () =>
    invalidBugReport(
      `${label} exceeds the maximum of ${MAX_STORAGE_NAME_LENGTH} (name) or ${MAX_STORAGE_VALUE_LENGTH} (value) characters`
    ),
});

const cookieRules = (cookie: StoredCookie): StorageRule[] => [
  fitsLimits("Cookie", [cookie.name, cookie.domain, cookie.path], cookie.value),
  {
    holds: () => COOKIE_SAME_SITE.includes(cookie.sameSite),
    violation: () =>
      invalidBugReport(`Invalid cookie sameSite: ${cookie.sameSite}`),
  },
  {
    holds: () => cookie.expiresAt === null || Number.isFinite(cookie.expiresAt),
    violation: () => invalidBugReport("Cookie expiresAt must be finite"),
  },
];

const sizeRule = (label: string, count: number): StorageRule => ({
  holds: () => count <= MAX_STORAGE_ENTRIES,
  violation: () =>
    invalidBugReport(`${label} exceeds the maximum of ${MAX_STORAGE_ENTRIES}`),
});

export const parseStorageSnapshot = (
  snapshot: StorageSnapshot
): Result<StorageSnapshot, CaptureDomainError> => {
  const rules: StorageRule[] = [
    sizeRule("Cookies", snapshot.cookies.length),
    sizeRule("localStorage items", snapshot.localStorage.length),
    sizeRule("sessionStorage items", snapshot.sessionStorage.length),
    ...snapshot.cookies.flatMap(cookieRules),
    ...[...snapshot.localStorage, ...snapshot.sessionStorage].map((item) =>
      fitsLimits("Storage item", [item.key], item.value)
    ),
  ];
  const checked = checkRules(...rules);
  return checked.ok ? ok(snapshot) : checked;
};
