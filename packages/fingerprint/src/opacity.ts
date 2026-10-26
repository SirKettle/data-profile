import type { FingerprintNode, RidgeStyle } from "./types";

/**
 * The opacity that shows a mark's lightness: 0.3 for the first category of an ordered dimension,
 * full strength for the last, and full strength when lightness is not encoded or unknown. Renderers
 * use it so lightness reads the same whatever they draw.
 */
export const markOpacity = (node: Pick<FingerprintNode, "lightness">) =>
  node.lightness === null ? 1 : 0.3 + 0.7 * node.lightness;

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
