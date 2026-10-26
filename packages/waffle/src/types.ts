import type { Dimension, Encoding, Item, Mark, Profile } from "@data-profile/core";

/** Everything `layoutWaffle` takes besides the data. */
export interface WaffleOptions {
  /** Which dimension drives what. Defaults to the first dimension arranging, colouring and shaping. */
  encoding?: Encoding;
  /**
   * Cells per row. Defaults to a square grid, the smallest that holds every mark. Pass 10 with 100
   * marks for the classic one-cell-per-percent waffle.
   */
  columns?: number;
  /** The space between neighbouring cells, as a share of the cell pitch, 0 to 0.9. Defaults to 0.15. */
  gap?: number;
  /**
   * Above this many items, cells stand for several items each. Defaults to 1,000: 32 cells a row,
   * each still a few pixels wide at phone width. A layout can exceed it slightly, since every
   * combination of encoded categories needs a cell.
   */
  maxMarks?: number;
}

/**
 * `layoutWaffle`'s one argument. The items array is treated as immutable: work is cached against
 * it, so pass a new array when the dataset changes.
 */
export interface WaffleInput extends WaffleOptions {
  /** One per cell (below the cap). Unique ids. */
  items: readonly Item[];
  /** Every dimension the items carry values for; the encoding picks among them. */
  dimensions: readonly Dimension[];
}

/** A cell: core's `Mark`, placed in the grid. */
export interface WaffleCell extends Mark {
  /** Centre, in the layout's frame. */
  x: number;
  /** Centre, in the layout's frame. */
  y: number;
  /** Width of the mark drawn in the cell. Area is proportional to weight. */
  size: number;
  /** Zero-based, left to right. */
  column: number;
  /** Zero-based, top to bottom. */
  row: number;
}

/**
 * What `layoutWaffle` returns: core's `Profile` with its marks placed as `cells`, in a frame of
 * fixed width whose height follows the number of rows.
 */
export interface WaffleLayout extends Omit<Profile, "marks"> {
  /** The fixed coordinate frame's width; resizing scales it, never changes it. */
  width: number;
  /** The frame's height: the rows, at the same pitch as the columns. */
  height: number;
  /** In reading order: left to right, then top to bottom, following core's mark order. */
  cells: WaffleCell[];
  /** Cells per row. */
  columns: number;
  /** Rows, the last possibly part-filled. */
  rows: number;
  /** Centre-to-centre distance between neighbouring cells. */
  pitch: number;
}
