/**
 * The data contract every view shares. It knows items, dimensions and categories, nothing about
 * what is being collected or how it is drawn: every domain word arrives as data.
 */

/** One thing in the dataset, drawn as one mark (below the mark cap). */
export interface Item {
  /** Stable and unique. Marks keep this identity when the view changes. */
  id: string;
  /** Mark area is proportional to weight. Defaults to 1; must be positive. */
  weight?: number;
  /**
   * The item's category in each dimension, keyed by dimension id. `null`, `undefined`, a missing
   * key or a category id the dimension does not list all place the item in that dimension's
   * unknown category: unknowns are drawn, never dropped.
   */
  values: Readonly<Record<string, string | null | undefined>>;
}

/** One category of a dimension. */
export interface Category {
  /** Unique within its dimension. `"~unknown"` is reserved. */
  id: string;
  /** Shown in legends, lists and descriptions. */
  label: string;
  /** Any CSS colour, custom properties included. Defaults to the package palette, by position. */
  color?: string;
  /** A link for this category, for views that list categories. */
  href?: string;
}

/** One way of grouping the items. Category order is the order marks are laid out in. */
export interface Dimension {
  /** Unique; the key items use in `values`. */
  id: string;
  /** Shown as the legend's heading and in descriptions. */
  label: string;
  /** In the order they should be drawn and listed. */
  categories: readonly Category[];
  /** Label of the category unknown values fall into. Defaults to "Unknown". */
  unknownLabel?: string;
  /**
   * True when the categories run in a meaningful order (decades, sizes). Only an ordered dimension
   * may drive lightness: on unordered categories, fainter and stronger would read as less and more.
   */
  ordered?: boolean;
}

/** The visual properties a dimension can drive. `arrange` orders the marks. */
export type Channel = "arrange" | "color" | "shape" | "lightness";

/**
 * Which dimension drives which visual property, by dimension id. `color` and `shape` default to
 * the `arrange` dimension, so `{ arrange: "genre" }` is a single-dimension view; `null` turns a
 * property off. Size is never available: mark area is reserved for weight.
 */
export interface Encoding {
  /** Orders the marks, so its categories form runs. */
  arrange: string;
  /** Colours each mark by this dimension's categories. Defaults to `arrange`. */
  color?: string | null;
  /** Gives each category of this dimension its own mark shape. Defaults to `arrange`. */
  shape?: string | null;
  /** Fades marks along this ordered dimension, first category faintest. Off by default. */
  lightness?: string | null;
}

/**
 * `encodeProfile`'s one argument. The items array is treated as immutable: work is cached against
 * it, so pass a new array when the dataset changes.
 */
export interface ProfileInput {
  /** One per mark (below the cap). Unique ids. */
  items: readonly Item[];
  /** Every dimension the items carry values for; the encoding picks among them. */
  dimensions: readonly Dimension[];
  /** Which dimension drives what. Defaults to the first dimension arranging, colouring and shaping. */
  encoding?: Encoding;
  /**
   * Above this many items, marks stand for several items each. No cap by default: a view sets the
   * most marks it can draw well. A profile can exceed it slightly, since every combination of
   * encoded categories needs a mark.
   */
  maxMarks?: number;
}

/** A mark: what to draw for one item (or several, above the cap), with no position yet. */
export interface Mark {
  /** The item id, or a combination key and index when the mark stands for several items. */
  id: string;
  /** The items this mark stands for: one, unless the dataset exceeded `maxMarks`. */
  itemIds: readonly string[];
  /**
   * The mark's category in every encoded dimension, keyed by dimension id; an unknown value is
   * `UNKNOWN_CATEGORY_ID`. The arranging category is `categories[profile.encoding.arrange]`.
   */
  categories: Readonly<Record<string, string>>;
  /** The summed weight of `itemIds`. Views make mark area proportional to it. */
  weight: number;
  /** From the colour dimension; `currentColor` when nothing drives colour. */
  color: string;
  /**
   * The mark's shape: the index of its category in the shape dimension (0, 1, 2, …). `0` also when
   * nothing drives shape, so a plain mark is the first shape; `null` when its shape category is
   * unknown.
   */
  shape: number | null;
  /** 0 (faintest) to 1 (full strength) along an ordered dimension; null when unknown or not encoded. */
  lightness: number | null;
}

/** One category in a legend, with how its marks are drawn and how many items it holds. */
export interface LegendEntry {
  /** The category id, or `UNKNOWN_CATEGORY_ID`. */
  id: string;
  /** The category label, or the dimension's `unknownLabel`. */
  label: string;
  /** The colour a mark of this category gets, or `currentColor` when this dimension drives no colour. */
  color: string;
  /** As `Mark.shape`, for this category; `0` when this dimension drives no shape. */
  shape: number | null;
  /** As `Mark.lightness`, for this category; null when this dimension drives no lightness. */
  lightness: number | null;
  /** The category's link, if it has one. */
  href?: string;
  /** True for the unknown category. */
  unknown: boolean;
  /** Items in this category, whatever their weight. */
  count: number;
  /** The summed weight of those items. */
  weight: number;
}

/** One dimension's legend, and which visual properties that dimension drives. */
export interface LegendGroup {
  /** The dimension's id. */
  dimensionId: string;
  /** The dimension's label. */
  label: string;
  /** What this dimension drives in the current encoding. */
  channels: readonly Channel[];
  /** In category order, the unknown category last and only when it has items. */
  entries: LegendEntry[];
}

/**
 * What `encodeProfile` returns: the marks in drawing order with every visual property resolved,
 * and the legends that explain them. A view gives each mark a position and a size.
 */
export interface Profile {
  /** Every property resolved to a dimension id, or null when off. */
  encoding: Required<Encoding>;
  /** In order: by the arranging dimension's categories, then the other encoded ones, then id. */
  marks: Mark[];
  /** One group per encoded dimension: colour first, then shape, lightness and arrangement. */
  legends: LegendGroup[];
  /** Encodings that will be hard to read, such as more colours than stay distinguishable. */
  warnings: string[];
  /** 1 unless the item count exceeded `maxMarks`. Say so on screen when it is not 1. */
  itemsPerMark: number;
  /** All the items, whatever `itemsPerMark`. */
  itemCount: number;
}
