import { err, ok } from "./result";
import type { Result } from "./result";

/** A named invariant: `holds` is evaluated lazily; `violation` builds the failure. */
export interface DomainRule<E> {
  readonly holds: () => boolean;
  readonly violation: () => E;
}

/** Checks rules in order and fails with the first violation, so later rules may rely on earlier ones. */
export const checkRules = <E>(
  ...rules: readonly DomainRule<E>[]
): Result<void, E> => {
  for (const rule of rules) {
    if (!rule.holds()) {
      return err(rule.violation());
    }
  }
  return ok();
};
