/**
 * `@data-profile/fingerprint`: the layout, as plain data, with no React. Lay items out
 * with `layoutFingerprint`, derive a form with `formFromItems`, describe it with `describeLayout`.
 *
 * @packageDocumentation
 * @module core
 */
export { layoutFingerprint, FingerprintDataError, UNKNOWN_CATEGORY_ID } from "./layout";
export { DEFAULT_PALETTE, UNKNOWN_COLOR } from "./palette";
export { formFromItems } from "./form";
export { markOpacity } from "./opacity";
export { placeCallouts, type PlacedCallout } from "./callouts";
export { describeLayout } from "./describe";
export type {
  FingerprintAnnotation,
  FingerprintCategory,
  FingerprintChannel,
  FingerprintDimension,
  FingerprintEncoding,
  FingerprintForm,
  FingerprintItem,
  FingerprintLayout,
  FingerprintLegendEntry,
  FingerprintLegendGroup,
  FingerprintNode,
  LayoutInput,
  LayoutOptions,
  RidgePattern,
  RidgeStyle,
} from "./types";
