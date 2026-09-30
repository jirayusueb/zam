import { checkRules } from "../../shared/domain-rule";
import type { DomainRule } from "../../shared/domain-rule";
import { ok } from "../../shared/result";
import type { Result } from "../../shared/result";
import { invalidBugReport } from "../capture-domain-error";
import type { CaptureDomainError } from "../capture-domain-error";

/**
 * `click`: detail = short element descriptor, e.g. `<button#save.primary> "Save"`.
 * `navigation`: detail = redacted URL (load, pushState/replaceState, popstate, hashchange).
 * `visibility`: detail = `"visible"` | `"hidden"`.
 */
export const USER_STEP_KINDS = ["click", "navigation", "visibility"] as const;
export type UserStepKind = (typeof USER_STEP_KINDS)[number];

/** One reporter action on the page during the recording window. Typed text is never captured. */
export interface UserStep {
  kind: UserStepKind;
  detail: string;
  timestamp: number;
}

export const MAX_USER_STEPS = 1000;
export const MAX_USER_STEP_DETAIL_LENGTH = 500;

type StepRule = DomainRule<CaptureDomainError>;

const stepRules = (step: UserStep): StepRule[] => [
  {
    holds: () => USER_STEP_KINDS.includes(step.kind),
    violation: () => invalidBugReport(`Invalid user step kind: ${step.kind}`),
  },
  {
    holds: () => step.detail.length <= MAX_USER_STEP_DETAIL_LENGTH,
    violation: () =>
      invalidBugReport(
        `User step detail exceeds the maximum of ${MAX_USER_STEP_DETAIL_LENGTH} characters`
      ),
  },
  {
    holds: () => Number.isFinite(step.timestamp),
    violation: () => invalidBugReport("User step timestamp must be finite"),
  },
];

export const parseUserSteps = (
  steps: readonly UserStep[]
): Result<readonly UserStep[], CaptureDomainError> => {
  const checked = checkRules(
    {
      holds: () => steps.length <= MAX_USER_STEPS,
      violation: () =>
        invalidBugReport(`User steps exceed the maximum of ${MAX_USER_STEPS}`),
    },
    ...steps.flatMap(stepRules)
  );
  return checked.ok ? ok(steps) : checked;
};
