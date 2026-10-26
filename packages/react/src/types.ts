import type { Encoding, LegendGroup, Mark } from "@data-profile/core";
import type { ReactNode } from "react";

/** A category of one dimension: what a legend entry or a mark selects. */
export interface Selection {
  /** The dimension the category belongs to. */
  dimensionId: string;
  /** The category's id, or `UNKNOWN_CATEGORY_ID`. */
  categoryId: string;
}

/** A named way of looking at the items: which dimension drives which visual property. */
export interface View {
  /** Unique among the views. */
  id: string;
  /** The switch's button text. */
  label: string;
  /** Which dimension drives what in this view. */
  encoding: Encoding;
}

/**
 * A mark a view has placed: core's `Mark` with a centre, a footprint and a direction, in the view's
 * coordinate frame. Every view's laid-out marks have this shape, so any renderer draws any view.
 */
export interface PlacedMark extends Mark {
  /** Centre, in the view's frame. */
  x: number;
  /** Centre, in the view's frame. */
  y: number;
  /** Diameter of the mark's footprint. Area is proportional to weight. */
  size: number;
  /** Degrees: the direction the mark runs in. 0 in a view whose marks all face one way. */
  rotation: number;
}

/** What a renderer's `mark` receives. */
export interface MarkProps<M extends PlacedMark = PlacedMark> {
  /** Carries the resolved `color`, `shape` (null when unknown) and `lightness` (null when full strength). */
  node: M;
  /** Prefix for any ids the renderer's `defs` declared, unique to this drawing. */
  idPrefix: string;
}

/**
 * Draws marks. `mark` draws one mark centred on the origin, `node.size` across, running along the x
 * axis: the canvas positions and rotates it, so a renderer never changes layout, counts or
 * selection. It should honour `node.color`, `node.shape` and `node.lightness` (see `markOpacity`),
 * since those carry data. `defs` runs once per drawing. Marks are memoised and selection is drawn
 * by the canvas (dimming the rest), so `mark` must depend on its props alone. The canvas
 * transitions the fill, fill-opacity and stroke of each mark's top-level elements.
 */
export interface Renderer<M extends PlacedMark = PlacedMark> {
  /** A name for debugging and for telling renderers apart. */
  name: string;
  /** Shared SVG definitions (gradients, patterns, symbols), rendered once per drawing. */
  defs?: (props: { idPrefix: string; legends: readonly LegendGroup[] }) => ReactNode;
  /** Draws one mark. */
  mark: (props: MarkProps<M>) => ReactNode;
}
