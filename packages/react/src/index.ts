/**
 * `@data-profile/react`: the React pieces every data-profile view shares. `MarkCanvas` draws any
 * view's placed marks, with motion and selection; `Legend`, `CategoryList` and `ViewSwitch` explain
 * and control them; `useViews` holds the active view and selection; the built-in renderers draw
 * the marks. A view's own `./react` entry builds its canvas on these.
 *
 * @packageDocumentation
 * @module react
 */
export { MarkCanvas, type MarkCanvasProps, type Motion } from "./MarkCanvas";
export {
  CategoryList,
  Legend,
  ViewSwitch,
  type CategoryListProps,
  type LegendProps,
  type ViewSwitchProps,
} from "./controls";
export { dotsRenderer, shapesRenderer } from "./renderers";
export { useViews, type GroupBinding, type UseViewsOptions, type ViewsState } from "./useViews";
export type { MarkProps, PlacedMark, Renderer, Selection, View } from "./types";
