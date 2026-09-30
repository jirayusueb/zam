import { err, ok } from "./result";
import type { Result } from "./result";

/** Explicit presence/absence, replacing `T | null` for lookups. */
export type Option<T> =
  | { readonly some: true; readonly value: T }
  | { readonly some: false };

export const some = <T>(value: T): Option<T> => ({ some: true, value });

export const none: Option<never> = { some: false };

export const okOr = <T, E>(option: Option<T>, onNone: () => E): Result<T, E> =>
  option.some ? ok(option.value) : err(onNone());
