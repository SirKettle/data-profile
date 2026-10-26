/**
 * The default categorical palette, for consumers that give categories no colour. Ten hues, chosen
 * to stay distinguishable on light and dark backgrounds; beyond ten they repeat, which is why the
 * legend and list, not colour, carry identity.
 */
export const DEFAULT_PALETTE = [
  "#2f6fde",
  "#2bb3e6",
  "#f26b3a",
  "#f5b82e",
  "#14a39a",
  "#7a5af5",
  "#3fae6b",
  "#d9488f",
  "#8c6d46",
  "#5e8c99",
] as const;

/** Unknowns are drawn in a neutral tone, outside the palette, so they never look like a category. */
export const UNKNOWN_COLOR = "#b8bcc4";
