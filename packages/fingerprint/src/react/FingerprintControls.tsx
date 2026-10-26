import {
  CategoryList,
  Legend,
  ViewSwitch,
  type CategoryListProps,
  type LegendProps,
  type View,
  type ViewSwitchProps,
} from "@data-profile/react";

/** A named way of looking at the items: which dimension drives which visual property. `@data-profile/react`'s `View`. */
export type FingerprintView = View;

/** Props of `FingerprintViewSwitch`. */
export type FingerprintViewSwitchProps = ViewSwitchProps;

/** One pressed button per view. `@data-profile/react`'s `ViewSwitch`. */
export const FingerprintViewSwitch = ViewSwitch;

/** Props of `FingerprintLegend`. `useFingerprint`'s `legendProps(group)` supplies most of them. */
export type FingerprintLegendProps = LegendProps;

/**
 * One dimension's categories, each drawn as a mark of it would be, and each a toggle that selects
 * it in the canvas. Render one per `layout.legends` group. `@data-profile/react`'s `Legend`.
 */
export const FingerprintLegend = Legend;

/** Props of `FingerprintList`. `useFingerprint`'s `listProps(group)` supplies most of them. */
export type FingerprintListProps = CategoryListProps;

/**
 * One dimension as a table: every category with its exact count and share. Render one per
 * `layout.legends` group. `@data-profile/react`'s `CategoryList`.
 */
export const FingerprintList = CategoryList;
