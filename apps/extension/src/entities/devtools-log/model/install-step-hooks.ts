import { redactUrl } from "@zam/capture/domain/value-objects/devtools-snapshot";
import {
  MAX_USER_STEP_DETAIL_LENGTH,
  MAX_USER_STEPS,
} from "@zam/capture/domain/value-objects/user-step";
import type {
  UserStep,
  UserStepKind,
} from "@zam/capture/domain/value-objects/user-step";

const MAX_CLASS_NAMES = 3;
const MAX_LABEL_LENGTH = 80;
const INTERACTIVE_SELECTOR =
  "a,button,input,select,textarea,label,summary,[role=button],[role=link],[role=tab],[role=menuitem],[onclick]";

const pushStep = (steps: UserStep[], kind: UserStepKind, detail: string) => {
  steps.push({
    detail: detail.slice(0, MAX_USER_STEP_DETAIL_LENGTH),
    kind,
    timestamp: Date.now(),
  });
  if (steps.length > MAX_USER_STEPS) {
    steps.shift();
  }
};

const isFormField = (element: Element): boolean =>
  element instanceof HTMLInputElement ||
  element instanceof HTMLTextAreaElement ||
  element instanceof HTMLSelectElement;

// Form fields are named by their label attributes only: their value is typed text and never captured.
const labelOf = (element: Element): string => {
  const label =
    element.getAttribute("aria-label") ??
    (isFormField(element)
      ? (element.getAttribute("name") ?? element.getAttribute("placeholder"))
      : (element as HTMLElement).textContent);
  return (label ?? "")
    .replaceAll(/\s+/gu, " ")
    .trim()
    .slice(0, MAX_LABEL_LENGTH);
};

/** `<button#save.primary.large> "Save"`: tag, id, first classes, visible label. */
const describeElement = (element: Element): string => {
  const id = element.id ? `#${element.id}` : "";
  const classes = [...element.classList]
    .slice(0, MAX_CLASS_NAMES)
    .map((name) => `.${name}`)
    .join("");
  const type =
    element instanceof HTMLInputElement ? `[type=${element.type}]` : "";
  const label = labelOf(element);
  const descriptor = `<${element.tagName.toLowerCase()}${id}${classes}${type}>`;
  return label ? `${descriptor} "${label}"` : descriptor;
};

let lastNavigationUrl: string | null = null;

// replaceState and hashchange often repeat the current URL; only real changes are steps.
const pushNavigation = (steps: UserStep[]) => {
  const url = redactUrl(location.href);
  if (url !== lastNavigationUrl) {
    lastNavigationUrl = url;
    pushStep(steps, "navigation", url);
  }
};

const patchHistory = (
  steps: UserStep[],
  method: "pushState" | "replaceState"
): void => {
  const original = history[method].bind(history);
  history[method] = (...args: Parameters<History["pushState"]>) => {
    original(...args);
    pushNavigation(steps);
  };
};

/** Records clicks, navigations and tab visibility into `steps` (MAIN world, document_start). */
export const installStepHooks = (steps: UserStep[]): void => {
  pushNavigation(steps);
  window.addEventListener(
    "click",
    (event) => {
      if (!(event.target instanceof Element)) {
        return;
      }
      const target = event.target.closest(INTERACTIVE_SELECTOR) ?? event.target;
      pushStep(steps, "click", describeElement(target));
    },
    { capture: true, passive: true }
  );
  patchHistory(steps, "pushState");
  patchHistory(steps, "replaceState");
  window.addEventListener("popstate", () => pushNavigation(steps));
  window.addEventListener("hashchange", () => pushNavigation(steps));
  document.addEventListener("visibilitychange", () =>
    pushStep(steps, "visibility", document.visibilityState)
  );
};
