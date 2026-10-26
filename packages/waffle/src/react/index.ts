/**
 * `@data-profile/waffle/react`: the waffle's canvas and the `useWaffle` hook that wires it to a
 * view switch, legends and lists. Those, and the renderers, are `@data-profile/react`'s, re-exported
 * here so one import draws a whole waffle.
 *
 * @packageDocumentation
 * @module waffle/react
 */
export { WaffleCanvas, type WaffleCanvasProps } from "./WaffleCanvas";
export {
  useWaffle,
  type UseWaffleOptions,
  type WaffleCanvasBinding,
  type WaffleState,
} from "./useWaffle";
export {
  CategoryList,
  dotsRenderer,
  Legend,
  shapesRenderer,
  ViewSwitch,
  type CategoryListProps,
  type LegendProps,
  type Renderer,
  type Selection,
  type View,
  type ViewSwitchProps,
} from "@data-profile/react";
