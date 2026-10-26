/**
 * `@data-profile/waffle`: a dataset as a grid of cells, one per item, filled in reading order so
 * each category is a run. Lay items out with `layoutWaffle`; the data types, `describeProfile` and
 * the palette come from `@data-profile/core`.
 *
 * @packageDocumentation
 * @module waffle
 */
export { layoutWaffle } from "./layout";
export type { WaffleCell, WaffleInput, WaffleLayout, WaffleOptions } from "./types";
