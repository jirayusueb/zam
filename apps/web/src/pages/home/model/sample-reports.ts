import type { DevtoolsSnapshot } from "@zam/capture/domain/value-objects/devtools-snapshot";

/**
 * Synthetic reports for the home page wall. Every name, URL and log line is
 * invented demo material; the page labels it "Sample data".
 */
export interface SampleReport {
  id: string;
  title: string;
  pageUrl: string;
  durationMs: number;
  startedAt: Date;
  devtools: DevtoolsSnapshot;
  /** What the recorded page shows at the moment of the bug. */
  screen: { heading: string; action: string; toast: string };
}

const START = Date.UTC(2026, 0, 12, 9, 30);
const at = (seconds: number): number => START + seconds * 1000;

export const SAMPLE_REPORTS: SampleReport[] = [
  {
    devtools: {
      console: [
        {
          level: "log",
          message: "[cart] 3 items, subtotal 48.00",
          timestamp: at(4),
        },
        {
          level: "warn",
          message: "Deprecated: payment_intent.confirm without return_url",
          timestamp: at(19),
        },
        {
          level: "error",
          message: "Uncaught (in promise) Error: Checkout failed: 500",
          timestamp: at(27),
        },
      ],
      network: [
        {
          durationMs: 88,
          method: "GET",
          status: 200,
          timestamp: at(2),
          url: "https://acme.app/api/cart",
        },
        {
          durationMs: 132,
          method: "POST",
          status: 200,
          timestamp: at(21),
          url: "https://acme.app/api/shipping/quote",
        },
        {
          durationMs: 1840,
          method: "POST",
          status: 500,
          timestamp: at(26),
          url: "https://acme.app/api/checkout",
        },
      ],
    },
    durationMs: 42_000,
    id: "checkout-500",
    pageUrl: "https://acme.app/checkout",
    screen: {
      action: "Pay $48.00",
      heading: "Checkout",
      toast: "Something went wrong. Try again.",
    },
    startedAt: new Date(START),
    title: "Checkout returns 500 on pay",
  },
  {
    devtools: {
      console: [
        {
          level: "info",
          message: "upload: 4.2 MB image/heic",
          timestamp: at(6),
        },
        {
          level: "error",
          message: "TypeError: Failed to fetch",
          timestamp: at(38),
        },
      ],
      network: [
        {
          durationMs: 30_012,
          method: "PUT",
          status: 0,
          timestamp: at(8),
          url: "https://cdn.acme.app/avatars/u_81f2",
        },
      ],
    },
    durationMs: 51_000,
    id: "avatar-hang",
    pageUrl: "https://acme.app/settings/profile",
    screen: {
      action: "Save photo",
      heading: "Profile",
      toast: "Uploading… 0%",
    },
    startedAt: new Date(START),
    title: "Avatar upload hangs at 0%",
  },
  {
    devtools: {
      console: [
        {
          level: "warn",
          message: "Cookie “session” rejected: SameSite=None without Secure",
          timestamp: at(3),
        },
        {
          level: "log",
          message: "redirect → /login?next=/home",
          timestamp: at(5),
        },
        {
          level: "log",
          message: "redirect → /login?next=/home",
          timestamp: at(9),
        },
      ],
      network: [
        {
          durationMs: 64,
          method: "POST",
          status: 302,
          timestamp: at(2),
          url: "https://acme.app/auth/callback?code=[REDACTED]",
        },
        {
          durationMs: 41,
          method: "GET",
          status: 401,
          timestamp: at(4),
          url: "https://acme.app/api/me",
        },
        {
          durationMs: 39,
          method: "GET",
          status: 401,
          timestamp: at(8),
          url: "https://acme.app/api/me",
        },
      ],
    },
    durationMs: 18_000,
    id: "safari-login-loop",
    pageUrl: "https://acme.app/login",
    screen: {
      action: "Sign in",
      heading: "Welcome back",
      toast: "Redirecting…",
    },
    startedAt: new Date(START),
    title: "Login loops on Safari",
  },
  {
    devtools: {
      console: [
        {
          level: "log",
          message: "total 59.97 (items 3 × 19.99)",
          timestamp: at(11),
        },
        {
          level: "warn",
          message: "Rounding mismatch: 59.97 vs 59.96",
          timestamp: at(12),
        },
      ],
      network: [
        {
          durationMs: 70,
          method: "PATCH",
          status: 200,
          timestamp: at(10),
          url: "https://shop.acme.app/api/cart/items/3",
        },
      ],
    },
    durationMs: 24_000,
    id: "cart-off-by-one",
    pageUrl: "https://shop.acme.app/cart",
    screen: {
      action: "Check out",
      heading: "Your cart",
      toast: "Total $59.96",
    },
    startedAt: new Date(START),
    title: "Cart total off by one cent",
  },
  {
    devtools: {
      console: [
        {
          level: "error",
          message:
            "ResizeObserver loop completed with undelivered notifications.",
          timestamp: at(7),
        },
        {
          level: "error",
          message: "Cannot read properties of undefined (reading 'rows')",
          timestamp: at(14),
        },
      ],
      network: [
        {
          durationMs: 212,
          method: "GET",
          status: 200,
          timestamp: at(5),
          url: "https://app.acme.io/api/reports?range=30d",
        },
      ],
    },
    durationMs: 33_000,
    id: "chart-blank",
    pageUrl: "https://app.acme.io/analytics",
    screen: {
      action: "Last 30 days",
      heading: "Analytics",
      toast: "No data to display",
    },
    startedAt: new Date(START),
    title: "Revenue chart renders blank",
  },
  {
    devtools: {
      console: [
        { level: "log", message: "invite sent to 1 address", timestamp: at(9) },
      ],
      network: [
        {
          durationMs: 401,
          method: "POST",
          status: 422,
          timestamp: at(8),
          url: "https://app.acme.io/api/invites",
        },
      ],
    },
    durationMs: 16_000,
    id: "invite-422",
    pageUrl: "https://app.acme.io/team",
    screen: {
      action: "Send invite",
      heading: "Invite teammates",
      toast: "Invite sent",
    },
    startedAt: new Date(START),
    title: "Invite says sent, API says 422",
  },
  {
    devtools: {
      console: [
        {
          level: "warn",
          message: "Slow network detected: font swap after 3000ms",
          timestamp: at(3),
        },
        {
          level: "error",
          message: "Hydration failed: server rendered 'Mon', client 'Tue'",
          timestamp: at(1),
        },
      ],
      network: [
        {
          durationMs: 3120,
          method: "GET",
          status: 200,
          timestamp: at(0),
          url: "https://acme.app/fonts/display.woff2",
        },
      ],
    },
    durationMs: 12_000,
    id: "hydration-date",
    pageUrl: "https://acme.app/schedule",
    screen: { action: "Book slot", heading: "Schedule", toast: "Tue 9:00" },
    startedAt: new Date(START),
    title: "Schedule shows the wrong day",
  },
  {
    devtools: {
      console: [
        {
          level: "error",
          message: "Stripe.js: IntegrationError: Invalid value for elements()",
          timestamp: at(4),
        },
      ],
      network: [
        {
          durationMs: 95,
          method: "GET",
          status: 200,
          timestamp: at(2),
          url: "https://js.stripe.com/v3",
        },
        {
          durationMs: 180,
          method: "POST",
          status: 400,
          timestamp: at(5),
          url: "https://acme.app/api/billing/setup?key=[REDACTED]",
        },
      ],
    },
    durationMs: 21_000,
    id: "billing-form",
    pageUrl: "https://acme.app/settings/billing",
    screen: {
      action: "Add card",
      heading: "Billing",
      toast: "Card form failed to load",
    },
    startedAt: new Date(START),
    title: "Card form never appears",
  },
  {
    devtools: {
      console: [
        {
          level: "log",
          message: "search: 'blue jacket' → 0 results",
          timestamp: at(6),
        },
      ],
      network: [
        {
          durationMs: 12,
          method: "GET",
          status: 200,
          timestamp: at(5),
          url: "https://shop.acme.app/api/search?q=blue%20jacket",
        },
      ],
    },
    durationMs: 14_000,
    id: "search-empty",
    pageUrl: "https://shop.acme.app/search",
    screen: { action: "Search", heading: "blue jacket", toast: "No results" },
    startedAt: new Date(START),
    title: "Search finds nothing for two words",
  },
];
