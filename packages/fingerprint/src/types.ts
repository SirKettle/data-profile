import type {
  Category,
  Channel,
  Dimension,
  Encoding,
  Item,
  LegendEntry,
  LegendGroup,
  Mark,
  Profile,
} from "@data-profile/core";

/**
 * The fingerprint's data contract. The data types are `@data-profile/core`'s, under the names this
 * package has always used; the rest is the fingerprint's own geometry.
 */

/** One thing in the collection, drawn as one mark (below the mark cap). Core's `Item`. */
export type FingerprintItem = Item;

/** One category of a dimension. Core's `Category`. */
export type FingerprintCategory = Category;

/** One way of grouping the items. Category order is the order marks are laid out in. Core's `Dimension`. */
export type FingerprintDimension = Dimension;

/** The visual properties a dimension can drive. `arrange` orders marks along the ridges. Core's `Channel`. */
export type FingerprintChannel = Channel;

/**
 * Which dimension drives which visual property, by dimension id. `arrange` orders marks along the
 * ridges. Core's `Encoding`.
 */
export type FingerprintEncoding = Encoding;

/** One category in a legend, with how its marks are drawn and how many items it holds. Core's `LegendEntry`. */
export type FingerprintLegendEntry = LegendEntry;

/** One dimension's legend, and which visual properties that dimension drives. Core's `LegendGroup`. */
export type FingerprintLegendGroup = LegendGroup;

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

/** A laid-out mark: core's `Mark`, placed in the layout's fixed coordinate frame. */
export interface FingerprintNode extends Mark {
  /** Centre, in the layout's frame. */
  x: number;
  /** Centre, in the layout's frame. */
  y: number;
  /** Degrees, the ridge's direction at this mark. */
  rotation: number;
  /** Diameter of the mark's footprint. Area is proportional to weight. */
  size: number;
}

/**
 * What `layoutFingerprint` returns: everything a renderer needs, in a fixed frame. Core's `Profile`
 * with its marks placed as `nodes`, and the ridges they sit on.
 */
export interface FingerprintLayout extends Omit<Profile, "marks"> {
  /** The fixed coordinate frame's width; resizing scales it, never changes it. */
  width: number;
  /** The fixed coordinate frame's height. */
  height: number;
  /** The marks, laid along the ridges from the core outwards. */
  nodes: FingerprintNode[];
  /** The ridges marks sit on, core outwards, as polylines of `[x, y]` points, for renderers that draw them. */
  ridges: (readonly [x: number, y: number])[][];
  /** The form actually drawn, every field resolved. */
  form: FingerprintForm;
  /** Centre-to-centre distance between neighbouring ridges. */
  ridgeSpacing: number;
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
