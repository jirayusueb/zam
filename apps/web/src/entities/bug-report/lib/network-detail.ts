export const DETAIL_TABS = ["headers", "payload", "response"] as const;
export type NetworkDetailTab = (typeof DETAIL_TABS)[number];
