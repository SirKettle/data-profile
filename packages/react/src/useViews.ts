import type { Dimension, LegendGroup } from "@data-profile/core";
import { useCallback, useMemo, useState } from "react";
import type { Selection, View } from "./types";

/** What `useViews` takes. */
export interface UseViewsOptions {
  /** Every dimension the items carry values for. */
  dimensions: readonly Dimension[];
  /**
   * The ways of looking, in switcher order. Defaults to one view per dimension, each driving
   * colour, shape and arrangement from that dimension alone.
   */
  views?: readonly View[];
  /** The view shown first. Defaults to the first. */
  initialViewId?: string;
  /** What one item is, for lists. Defaults to "items". */
  unit?: string;
}

/** Props for `Legend` or `CategoryList`, for one legend group, ready to spread. */
export interface GroupBinding {
  /** The legend group. */
  group: LegendGroup;
  /** The current selection. */
  selected: Selection | null;
  /** Updates the selection. */
  onSelect: (selection: Selection | null) => void;
}

/** What `useViews` returns. */
export interface ViewsState {
  /** The views, as given or one per dimension. */
  views: readonly View[];
  /** The active view. */
  view: View | undefined;
  /** The active view's id. */
  viewId: string;
  /** Switches view and clears the selection. */
  setViewId: (viewId: string) => void;
  /** The selected category of a dimension, or null. */
  selected: Selection | null;
  /** Selects a category of a dimension, or clears with null. */
  setSelected: (selection: Selection | null) => void;
  /** Spread onto a `Legend` for one group. */
  legendProps: (group: LegendGroup) => GroupBinding;
  /** Spread onto a `CategoryList` for one group, with `unit` included. */
  listProps: (group: LegendGroup) => GroupBinding & { unit: string };
}

/**
 * The state every view needs whatever it draws: the active view and the selected category, with
 * prop bundles that wire them to `Legend` and `CategoryList`. Changing view clears the selection. A
 * view's own hook adds its layout to this.
 */
export function useViews({
  dimensions,
  views: given,
  initialViewId,
  unit = "items",
}: UseViewsOptions): ViewsState {
  const views = useMemo<readonly View[]>(
    () =>
      given ?? dimensions.map((d) => ({ id: d.id, label: d.label, encoding: { arrange: d.id } })),
    [given, dimensions],
  );
  const [viewId, setView] = useState(initialViewId ?? views[0]?.id ?? "");
  const [selected, setSelected] = useState<Selection | null>(null);
  const view = views.find((v) => v.id === viewId) ?? views[0];
  const setViewId = useCallback((id: string) => {
    setView(id);
    setSelected(null);
  }, []);
  const legendProps = useCallback(
    (group: LegendGroup) => ({ group, selected, onSelect: setSelected }),
    [selected],
  );
  const listProps = useCallback(
    (group: LegendGroup) => ({ group, selected, onSelect: setSelected, unit }),
    [selected, unit],
  );
  return {
    views,
    view,
    viewId: view?.id ?? "",
    setViewId,
    selected,
    setSelected,
    legendProps,
    listProps,
  };
}
