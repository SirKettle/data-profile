import type { Mark } from "./types";

/**
 * The opacity that shows a mark's lightness: 0.3 for the first category of an ordered dimension,
 * full strength for the last, and full strength when lightness is not encoded or unknown. Renderers
 * use it so lightness reads the same whatever they draw.
 */
export const markOpacity = (mark: Pick<Mark, "lightness">) =>
  mark.lightness === null ? 1 : 0.3 + 0.7 * mark.lightness;
