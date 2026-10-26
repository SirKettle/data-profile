import { MarkCanvas, type Motion, type Renderer, type Selection } from "@data-profile/react";
import type { WaffleCell, WaffleLayout } from "../types";

/** Props of `WaffleCanvas`. `useWaffle`'s `canvasProps` supplies most of them. */
export interface WaffleCanvasProps {
  /** What to draw: from `useWaffle` (`canvasProps`) or `layoutWaffle`. */
  layout: WaffleLayout;
  /** The drawing's accessible name. */
  title: string;
  /** What it shows, in words (core's `describeProfile` writes one). */
  description: string;
  /** Draws each cell's mark. Defaults to `@data-profile/react`'s `shapesRenderer`. */
  renderer?: Renderer<WaffleCell>;
  /** Cells in this category of this dimension are highlighted, the rest dimmed. */
  selected?: Selection | null;
  /**
   * Called when a cell is clicked, with its category in the arranging dimension, or null when that
   * is already the selection.
   */
  onSelect?: (selection: Selection | null) => void;
  /** Names what one item is, for the selection announcement. Defaults to "items". */
  unit?: string;
  /** How cells move when the view changes. See `@data-profile/react`'s `Motion`. */
  motion?: Motion;
  /** Extra class on the canvas's wrapper, beside `dp-canvas` and `dp-waffle`. */
  className?: string;
}

/**
 * The waffle: one mark per cell, drawn by `renderer`, in reading order. It is
 * `@data-profile/react`'s `MarkCanvas` over the grid, so cells glide to their new places when the
 * view changes (instantly under reduced motion), cells outside a selection dim, and the SVG is one
 * image named and described by `title` and `description`. Choosing a category is done from a
 * `Legend` or `CategoryList`, which are keyboard reachable, and also by pointer on a cell.
 */
export function WaffleCanvas({ layout, className, ...props }: WaffleCanvasProps) {
  return (
    <MarkCanvas
      {...props}
      marks={layout.cells}
      legends={layout.legends}
      arrange={layout.encoding.arrange}
      viewBox={[0, 0, layout.width, layout.height]}
      className={["dp-waffle", className].filter(Boolean).join(" ")}
    />
  );
}
