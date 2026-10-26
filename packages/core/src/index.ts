/**
 * `@data-profile/core`: what every view of a dataset shares. `encodeProfile` turns items and
 * dimensions into ordered marks with their colour, shape and lightness, and the legends that
 * explain them; a view package gives each mark a position.
 *
 * @packageDocumentation
 * @module core
 */
export { encodeProfile, DataError, UNKNOWN_CATEGORY_ID } from "./encode";
export { describeProfile } from "./describe";
export { DEFAULT_PALETTE, UNKNOWN_COLOR } from "./palette";
export { markOpacity } from "./opacity";
export { stableHash, unitHash } from "./hash";
export type {
  Category,
  Channel,
  Dimension,
  Encoding,
  Item,
  LegendEntry,
  LegendGroup,
  Mark,
  Profile,
  ProfileInput,
} from "./types";
