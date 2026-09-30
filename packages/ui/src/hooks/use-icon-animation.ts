import { useRef } from "react";

interface AnimatedIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

/**
 * Plays a lucide-animated icon when its whole control is hovered or
 * keyboard-focused, not just the 16px glyph. Passing `iconRef` switches the
 * icon to controlled mode, so it stops animating on its own hover.
 */
export const useIconAnimation = <Handle extends AnimatedIconHandle>() => {
  const iconRef = useRef<Handle>(null);
  const start = () => iconRef.current?.startAnimation();
  const stop = () => iconRef.current?.stopAnimation();

  // Tuple, not object: keeps the ref out of the value spread onto the trigger (react-compiler refs rule).
  return [
    iconRef,
    { onBlur: stop, onFocus: start, onMouseEnter: start, onMouseLeave: stop },
  ] as const;
};

/** Ref callback that plays an icon once when it mounts (e.g. the check that replaces "Copy"). Module-level so its identity is stable. */
export const playOnMount = (handle: AnimatedIconHandle | null) => {
  handle?.startAnimation();
};
