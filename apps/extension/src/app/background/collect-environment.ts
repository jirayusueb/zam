import type { ClientEnvironment } from "@zam/capture/domain/value-objects/client-environment";

interface NavigatorUAData {
  getHighEntropyValues: (hints: string[]) => Promise<{
    fullVersionList?: { brand: string; version: string }[];
    platform?: string;
    platformVersion?: string;
  }>;
}

type PageEnvironment = Omit<ClientEnvironment, "browser" | "os">;

// Injected into the tab; must be self-contained.
const readPageEnvironment = (): PageEnvironment => {
  const { connection } = navigator as Navigator & {
    connection?: { downlink?: number; effectiveType?: string };
  };
  return {
    connection:
      connection?.effectiveType === undefined ||
      connection.downlink === undefined
        ? null
        : {
            downlinkMbps: connection.downlink,
            effectiveType: connection.effectiveType,
          },
    devicePixelRatio: window.devicePixelRatio,
    language: navigator.language,
    screen: { height: screen.height, width: screen.width },
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    userAgent: navigator.userAgent,
    viewport: { height: window.innerHeight, width: window.innerWidth },
  };
};

const BRAND_NAMES: Record<string, string> = {
  "Google Chrome": "Chrome",
  "Microsoft Edge": "Edge",
  Opera: "Opera",
};
// Windows reports platformVersion >= 13 on Windows 11 (UA-CH spec guidance).
const WINDOWS_11_PLATFORM_MAJOR = 13;
const FIREFOX_REGEX = /Firefox\/(?<version>[\d.]+)/u;
const UA_OS_PATTERNS: [RegExp, string][] = [
  [/Android/u, "Android"],
  [/iPhone|iPad/u, "iOS"],
  [/Mac OS X/u, "macOS"],
  [/Windows/u, "Windows"],
  [/CrOS/u, "ChromeOS"],
  [/Linux/u, "Linux"],
];

const describeOs = (platform: string, version: string): string => {
  if (platform === "Windows") {
    return Number(version.split(".")[0]) >= WINDOWS_11_PLATFORM_MAJOR
      ? "Windows 11"
      : "Windows 10";
  }
  return version ? `${platform} ${version}` : platform;
};

/** Browser + OS from UA Client Hints (Chromium), else the UA string (Firefox). */
const describeBrowserAndOs = async (
  userAgent: string
): Promise<Pick<ClientEnvironment, "browser" | "os">> => {
  const { userAgentData } = navigator as Navigator & {
    userAgentData?: NavigatorUAData;
  };
  if (userAgentData) {
    const hints = await userAgentData.getHighEntropyValues([
      "fullVersionList",
      "platformVersion",
    ]);
    const brands = hints.fullVersionList ?? [];
    const brand =
      brands.find(({ brand: name }) => name in BRAND_NAMES) ??
      brands.find(({ brand: name }) => name === "Chromium");
    return {
      browser: brand
        ? `${BRAND_NAMES[brand.brand] ?? brand.brand} ${brand.version}`
        : "Chromium",
      os: describeOs(hints.platform ?? "", hints.platformVersion ?? ""),
    };
  }
  const firefox = FIREFOX_REGEX.exec(userAgent);
  return {
    browser: firefox ? `Firefox ${firefox.groups?.version}` : "Unknown",
    os:
      UA_OS_PATTERNS.find(([pattern]) => pattern.test(userAgent))?.[1] ??
      "Unknown",
  };
};

/** The reporter's browser and device when the recording stopped; `null` on restricted pages. */
export const collectEnvironment = async (
  tabId: number
): Promise<ClientEnvironment | null> => {
  try {
    const [injection] = await browser.scripting.executeScript({
      func: readPageEnvironment,
      target: { tabId },
    });
    const page = injection?.result as PageEnvironment | undefined;
    if (!page) {
      return null;
    }
    return { ...page, ...(await describeBrowserAndOs(page.userAgent)) };
  } catch {
    return null;
  }
};
