import type { RidgeStyle } from "./types";

/**
 * The ridges' opacity for a collection of `itemCount` items under `style`: constant for `always`,
 * zero for `never`, and for `auto` (the default) full until `fadeFrom` items, fading to nothing at
 * `fadeTo`.
 */
export function ridgeOpacity(itemCount: number, style: RidgeStyle = {}): number {
  const { show = "auto", fadeFrom = 60, fadeTo = 160, opacity = 0.22 } = style;
  if (show === "never") return 0;
  if (show === "always" || itemCount <= fadeFrom) return opacity;
  if (itemCount >= fadeTo) return 0;
  return opacity * (1 - (itemCount - fadeFrom) / (fadeTo - fadeFrom));
}
