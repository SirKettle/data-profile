/**
 * The fingerprint's data contract. It knows items, dimensions and categories, nothing about what
 * is being collected: every domain word arrives as data.
 */

/** One thing in the collection, drawn as one mark (below the mark cap). */
export interface FingerprintItem {
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
export interface FingerprintCategory {
  /** Unique within its dimension. `"~unknown"` is reserved. */
  id: string;
  /** Shown in legends, lists and descriptions. */
  label: string;
  /** Any CSS colour, custom properties included. Defaults to the package palette, by position. */
  color?: string;
  /** A link for this category, shown in `FingerprintList`. */
  href?: string;
}

/** One way of grouping the items. Category order is the order marks are laid out in. */
export interface FingerprintDimension {
  /** Unique; the key items use in `values`. */
  id: string;
  /** Shown as the legend's heading and in descriptions. */
  label: string;
  /** In the order they should be drawn and listed. */
  categories: readonly FingerprintCategory[];
  /** Label of the category unknown values fall into. Defaults to "Unknown". */
  unknownLabel?: string;
  /**
   * True when the categories run in a meaningful order (decades, sizes). Only an ordered dimension
   * may drive lightness: on unordered categories, fainter and stronger would read as less and more.
   */
  ordered?: boolean;
}

/** The visual properties a dimension can drive. `arrange` orders marks along the ridges. */
export type FingerprintChannel = "arrange" | "color" | "shape" | "lightness";

/**
 * Which dimension drives which visual property, by dimension id. `color` and `shape` default to
 * the `arrange` dimension, so `{ arrange: "genre" }` is a single-dimension view; `null` turns a
 * property off. Size is never available: mark area is reserved for weight.
 */
export interface FingerprintEncoding {
  /** Orders marks along the ridges, so its categories form runs. */
  arrange: string;
  /** Colours each mark by this dimension's categories. Defaults to `arrange`. */
  color?: string | null;
  /** Gives each category of this dimension its own mark shape. Defaults to `arrange`. */
  shape?: string | null;
  /** Fades marks along this ordered dimension, first category faintest. Off by default. */
  lightness?: string | null;
}

/** The three classes every fingerprint falls into. */
export type RidgePattern = "loop" | "whorl" | "arch";

/**
 * The print's form: its pattern and where its singular points sit. Every number is a small,
 * bounded nudge, so any form still reads as a fingertip. (A mark's *shape* is something else: an
 * encoding.)
 */
export interface FingerprintForm {
  /** Loop, whorl or arch. */
  pattern: RidgePattern;
  /** Which way a loop opens, or a whorl twists. */
  hand: -1 | 1;
  /** -1 to 1: moves the core left or right of centre. */
  coreX: number;
  /** -1 to 1: moves the core up or down. */
  coreY: number;
  /** 0 to 1: how far the deltas sit from the core; wider reads looser. */
  spread: number;
  /** Degrees, -10 to 10: the whole pattern's lean. */
  tilt: number;
}

/** Everything `layoutFingerprint` takes besides the data. */
export interface LayoutOptions {
  /** Which dimension drives what. Defaults to the first dimension arranging, colouring and shaping. */
  encoding?: FingerprintEncoding;
  /** Seeds any form field not given, and nothing else. Same seed, same picture. */
  seed?: string;
  /** Overrides the print's form. `formFromItems` derives one from the data. */
  form?: Partial<FingerprintForm>;
  /**
   * Above this many items, marks stand for several items each. Defaults to 600, the most marks a
   * canvas glides smoothly (see `FingerprintCanvas`'s `motion`); raise it for denser prints. A
   * layout can exceed it slightly, since every combination of encoded categories needs a mark.
   */
  maxMarks?: number;
  /** Ridges never sit further apart than the frame's half-width divided by this. Defaults to 6. */
  minRidges?: number;
}

/**
 * `layoutFingerprint`'s one argument. The items array is treated as immutable: work is cached
 * against it, so pass a new array when the collection changes.
 */
export interface LayoutInput extends LayoutOptions {
  /** One per mark (below the cap). Unique ids. */
  items: readonly FingerprintItem[];
  /** Every dimension the items carry values for; the encoding picks among them. */
  dimensions: readonly FingerprintDimension[];
}

/** A point in the layout's frame. Internal: the public types spell it out. */
export type Point = readonly [x: number, y: number];

/** A laid-out mark, in the layout's fixed coordinate frame. */
export interface FingerprintNode {
  /** The item id, or a combination key and index when the mark stands for several items. */
  id: string;
  /** The items this mark stands for: one, unless the collection exceeded `maxMarks`. */
  itemIds: readonly string[];
  /**
   * The mark's category in every encoded dimension, keyed by dimension id; an unknown value is
   * `UNKNOWN_CATEGORY_ID`. The arranging category is `categories[layout.encoding.arrange]`.
   */
  categories: Readonly<Record<string, string>>;
  /** Centre, in the layout's frame. */
  x: number;
  /** Centre, in the layout's frame. */
  y: number;
  /** Degrees, the ridge's direction at this mark. */
  rotation: number;
  /** Diameter of the mark's footprint. Area is proportional to weight. */
  size: number;
  /** The summed weight of `itemIds`. */
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
export interface FingerprintLegendEntry {
  /** The category id, or `UNKNOWN_CATEGORY_ID`. */
  id: string;
  /** The category label, or the dimension's `unknownLabel`. */
  label: string;
  /** The colour a mark of this category gets, or `currentColor` when this dimension drives no colour. */
  color: string;
  /** As `FingerprintNode.shape`, for this category; `0` when this dimension drives no shape. */
  shape: number | null;
  /** As `FingerprintNode.lightness`, for this category; null when this dimension drives no lightness. */
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
export interface FingerprintLegendGroup {
  /** The dimension's id. */
  dimensionId: string;
  /** The dimension's label. */
  label: string;
  /** What this dimension drives in the current encoding. */
  channels: readonly FingerprintChannel[];
  /** In category order, the unknown category last and only when it has items. */
  entries: FingerprintLegendEntry[];
}

/** What `layoutFingerprint` returns: everything a renderer needs, in a fixed frame. */
export interface FingerprintLayout {
  /** The fixed coordinate frame's width; resizing scales it, never changes it. */
  width: number;
  /** The fixed coordinate frame's height. */
  height: number;
  /** Every property resolved to a dimension id, or null when off. */
  encoding: Required<FingerprintEncoding>;
  /** The marks, laid along the ridges from the core outwards. */
  nodes: FingerprintNode[];
  /** The ridges marks sit on, core outwards, as polylines of `[x, y]` points, for renderers that draw them. */
  ridges: (readonly [x: number, y: number])[][];
  /** The form actually drawn, every field resolved. */
  form: FingerprintForm;
  /** Centre-to-centre distance between neighbouring ridges. */
  ridgeSpacing: number;
  /** One group per encoded dimension: colour first, then shape, lightness and arrangement. */
  legends: FingerprintLegendGroup[];
  /** Encodings that will be hard to read, such as more colours than stay distinguishable. */
  warnings: string[];
  /** 1 unless the item count exceeded `maxMarks`. Say so on screen when it is not 1. */
  itemsPerMark: number;
  /** All the items, whatever `itemsPerMark`. */
  itemCount: number;
}

/**
 * How the ridges behind the marks are drawn. `auto` shows them while a collection is too small for
 * its marks alone to read as a fingerprint, fading out as it fills.
 */
export interface RidgeStyle {
  /** `auto` (the default), `always` or `never`. */
  show?: "auto" | "always" | "never";
  /** `auto`: full opacity at or below this many items. Defaults to 60. */
  fadeFrom?: number;
  /** `auto`: gone at or above this many items. Defaults to 160. */
  fadeTo?: number;
  /** Opacity at full strength. Defaults to 0.22. */
  opacity?: number;
  /** Any CSS colour. Defaults to `currentColor`. */
  color?: string;
  /** Stroke width as a share of the ridge spacing. Defaults to 0.12. */
  width?: number;
}

/**
 * A note pinned to the fingerprint, such as "Mostly fiction". The consumer writes the words; the
 * canvas points a leader at a real mark of the named categories.
 */
export interface FingerprintAnnotation {
  /** Unique among the annotations. */
  id: string;
  /** Categories the note is about. Hidden when none has a mark. */
  categoryIds: readonly string[];
  /** The dimension those categories belong to. Defaults to the arranging dimension. */
  dimensionId?: string;
  /** The note's headline. */
  title: string;
  /** A sentence under it. */
  body?: string;
}
