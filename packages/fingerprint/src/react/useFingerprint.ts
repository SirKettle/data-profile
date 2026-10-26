import { useCallback, useMemo, useState } from "react";
import { describeLayout } from "../describe";
import { formFromItems } from "../form";
import { emptyLayout, FingerprintDataError, layoutFingerprint } from "../layout";
import type {
  FingerprintDimension,
  FingerprintForm,
  FingerprintItem,
  FingerprintLayout,
  FingerprintLegendGroup,
} from "../types";
import type { FingerprintSelection } from "./FingerprintCanvas";
import type { FingerprintView } from "./FingerprintControls";

/** What `useFingerprint` takes. */
export interface UseFingerprintOptions {
  /** One per mark (below the cap), unique ids. Treated as immutable: pass a new array to change it. */
  items: readonly FingerprintItem[];
  /** Every dimension the items carry values for. */
  dimensions: readonly FingerprintDimension[];
  /**
   * The ways of looking, in switcher order. Defaults to one view per dimension, each driving
   * colour, shape and arrangement from that dimension alone.
   */
  views?: readonly FingerprintView[];
  /** The view shown first. Defaults to the first. */
  initialViewId?: string;
  /** Overrides fields of the form `formFromItems` derives from the data. */
  form?: Partial<FingerprintForm>;
  /** Seeds the form's free fields. Same seed, same picture. Defaults to "fingerprint". */
  seed?: string;
  /** Above this many items, marks stand for several. Defaults to 600. */
  maxMarks?: number;
  /** What one item is, for the description and announcements. Defaults to "items". */
  unit?: string;
}

/** Props for `FingerprintCanvas`, ready to spread; add a `title`. */
export interface FingerprintCanvasBinding {
  /** The current view's layout. */
  layout: FingerprintLayout;
  /** `describeLayout`'s summary of it, or the data error's message. */
  description: string;
  /** The current selection. */
  selected: FingerprintSelection | null;
  /** Updates the selection. */
  onSelect: (selection: FingerprintSelection | null) => void;
  /** What one item is. */
  unit: string;
}

/** Props for `FingerprintLegend` or `FingerprintList`, for one legend group, ready to spread. */
export interface FingerprintGroupBinding {
  /** The legend group. */
  group: FingerprintLegendGroup;
  /** The current selection. */
  selected: FingerprintSelection | null;
  /** Updates the selection. */
  onSelect: (selection: FingerprintSelection | null) => void;
}

/** What `useFingerprint` returns. */
export interface FingerprintState {
  /** The current view's layout; empty while `error` is set. */
  layout: FingerprintLayout;
  /** A plain-language summary of the layout, for the canvas's description. */
  description: string;
  /** Invalid data (duplicate ids, lightness on an unordered dimension, …), or null. */
  error: FingerprintDataError | null;
  /** The views, as given or one per dimension. */
  views: readonly FingerprintView[];
  /** The active view. */
  view: FingerprintView | undefined;
  /** The active view's id. */
  viewId: string;
  /** Switches view and clears the selection. */
  setViewId: (viewId: string) => void;
  /** The selected category of a dimension, or null. */
  selected: FingerprintSelection | null;
  /** Selects a category of a dimension, or clears with null. */
  setSelected: (selection: FingerprintSelection | null) => void;
  /** Spread onto `FingerprintCanvas`, with a `title`. */
  canvasProps: FingerprintCanvasBinding;
  /** Spread onto a `FingerprintLegend` for one group. */
  legendProps: (group: FingerprintLegendGroup) => FingerprintGroupBinding;
  /** Spread onto a `FingerprintList` for one group, with `unit` included. */
  listProps: (group: FingerprintLegendGroup) => FingerprintGroupBinding & { unit: string };
}

/**
 * The state a fingerprint needs: the active view, the selected category, the layout for both, and
 * prop bundles that wire them to the components. The form is derived from all the items and
 * dimensions, never the active view, so the ridges hold still and only the marks move when the
 * view changes. Changing view clears the selection. Invalid data comes back as `error` with an
 * empty layout, rather than throwing out of render.
 */
export function useFingerprint({
  items,
  dimensions,
  views: given,
  initialViewId,
  form,
  seed = "fingerprint",
  maxMarks,
  unit = "items",
}: UseFingerprintOptions): FingerprintState {
  const views = useMemo<readonly FingerprintView[]>(
    () =>
      given ?? dimensions.map((d) => ({ id: d.id, label: d.label, encoding: { arrange: d.id } })),
    [given, dimensions],
  );
  const [viewId, setView] = useState(initialViewId ?? views[0]?.id ?? "");
  const [selected, setSelected] = useState<FingerprintSelection | null>(null);
  const view = views.find((v) => v.id === viewId) ?? views[0];
  const resolvedForm = useMemo(
    () => ({ ...formFromItems(items, dimensions, seed), ...form }),
    [items, dimensions, seed, form],
  );
  const { layout, error } = useMemo(() => {
    try {
      const layout = layoutFingerprint({
        items,
        dimensions,
        encoding: view?.encoding,
        seed,
        form: resolvedForm,
        maxMarks,
      });
      return { layout, error: null };
    } catch (caught) {
      if (caught instanceof FingerprintDataError) return { layout: emptyLayout(), error: caught };
      throw caught;
    }
  }, [items, dimensions, view, seed, resolvedForm, maxMarks]);
  const description = useMemo(
    () => (error ? error.message : describeLayout(layout, unit)),
    [layout, error, unit],
  );
  const setViewId = useCallback((id: string) => {
    setView(id);
    setSelected(null);
  }, []);
  const canvasProps = useMemo(
    () => ({ layout, description, selected, onSelect: setSelected, unit }),
    [layout, description, selected, unit],
  );
  const legendProps = useCallback(
    (group: FingerprintLegendGroup) => ({ group, selected, onSelect: setSelected }),
    [selected],
  );
  const listProps = useCallback(
    (group: FingerprintLegendGroup) => ({ group, selected, onSelect: setSelected, unit }),
    [selected, unit],
  );
  return {
    layout,
    description,
    error,
    views,
    view,
    viewId: view?.id ?? "",
    setViewId,
    selected,
    setSelected,
    canvasProps,
    legendProps,
    listProps,
  };
}
