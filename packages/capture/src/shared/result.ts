/** Expected, recoverable failure as a value; exceptions stay for infrastructure faults. */
export type Result<T, E> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

export function ok(): Result<void, never>;
export function ok<T>(value: T): Result<T, never>;
export function ok<T>(value?: T): Result<T | undefined, never> {
  return { ok: true, value };
}

export const err = <E>(error: E): Result<never, E> => ({ error, ok: false });

/** For trusted inputs (rehydration, generated ids) where a failure is a bug, not a user error. */
export const unwrap = <T, E extends Error>(result: Result<T, E>): T => {
  if (!result.ok) {
    throw result.error;
  }
  return result.value;
};
