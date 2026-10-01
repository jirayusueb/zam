export const STORAGE_AREAS = [
  "cookies",
  "localStorage",
  "sessionStorage",
] as const;
export type StorageArea = (typeof STORAGE_AREAS)[number];
