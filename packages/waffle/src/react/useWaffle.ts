import { DataError, describeProfile, type Dimension, type Item } from "@data-profile/core";
import { useViews, type Selection, type View, type ViewsState } from "@data-profile/react";
import { useMemo } from "react";
import { emptyWaffle, layoutWaffle } from "../layout";
import type { WaffleLayout } from "../types";

/** What `useWaffle` takes. */
export interface UseWaffleOptions {
  /** One per cell (below the cap), unique ids. Treated as immutable: pass a new array to change it. */
  items: readonly Item[];
  /** Every dimension the items carry values for. */
  dimensions: readonly Dimension[];
  /**
   * The ways of looking, in switcher order. Defaults to one view per dimension, each driving
   * colour, shape and arrangement from that dimension alone.
   */
  views?: readonly View[];
  /** The view shown first. Defaults to the first. */
  initialViewId?: string;
  /** Cells per row. Defaults to a square grid. */
  columns?: number;
  /** The space between cells, as a share of the cell pitch. Defaults to 0.15. */
  gap?: number;
  /** Above this many items, cells stand for several. Defaults to 1,000. */
  maxMarks?: number;
  /** What one item is, for the description and announcements. Defaults to "items". */
  unit?: string;
}

/** Props for `WaffleCanvas`, ready to spread; add a `title`. */
export interface WaffleCanvasBinding {
  /** The current view's layout. */
  layout: WaffleLayout;
  /** `describeProfile`'s summary of it, or the data error's message. */
  description: string;
  /** The current selection. */
  selected: Selection | null;
  /** Updates the selection. */
  onSelect: (selection: Selection | null) => void;
  /** What one item is. */
  unit: string;
}

/** What `useWaffle` returns: `useViews`'s state, with the layout for it. */
export interface WaffleState extends ViewsState {
  /** The current view's layout; empty while `error` is set. */
  layout: WaffleLayout;
  /** A plain-language summary of the layout, for the canvas's description. */
  description: string;
  /** Invalid data (duplicate ids, lightness on an unordered dimension, …), or null. */
  error: DataError | null;
  /** Spread onto `WaffleCanvas`, with a `title`. */
  canvasProps: WaffleCanvasBinding;
}

/**
 * The state a waffle needs: `@data-profile/react`'s `useViews` (the active view and the selected
 * category, with prop bundles for `Legend` and `CategoryList`) and the layout for them. Changing
 * view clears the selection. Invalid data comes back as `error` with an empty layout, rather than
 * throwing out of render.
 */
export function useWaffle({
  items,
  dimensions,
  views,
  initialViewId,
  columns,
  gap,
  maxMarks,
  unit = "items",
}: UseWaffleOptions): WaffleState {
  const state = useViews({ dimensions, views, initialViewId, unit });
  const { view, selected, setSelected } = state;
  const { layout, error } = useMemo(() => {
    try {
      const layout = layoutWaffle({
        items,
        dimensions,
        encoding: view?.encoding,
        columns,
        gap,
        maxMarks,
      });
      return { layout, error: null };
    } catch (caught) {
      if (caught instanceof DataError) return { layout: emptyWaffle(), error: caught };
      throw caught;
    }
  }, [items, dimensions, view, columns, gap, maxMarks]);
  const description = useMemo(
    () => (error ? error.message : describeProfile(layout, unit)),
    [layout, error, unit],
  );
  const canvasProps = useMemo(
    () => ({ layout, description, selected, onSelect: setSelected, unit }),
    [layout, description, selected, setSelected, unit],
  );
  return { ...state, layout, description, error, canvasProps };
}
