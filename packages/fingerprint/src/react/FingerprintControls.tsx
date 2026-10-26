import { useId } from "react";
import type { FingerprintEncoding, FingerprintLegendGroup } from "../types";
import type { FingerprintSelection } from "./FingerprintCanvas";
import { shapesRenderer, type FingerprintRenderer } from "./renderers";

const join = (...names: (string | undefined | false)[]) => names.filter(Boolean).join(" ");

/** A named way of looking at the items: which dimension drives which visual property. */
export interface FingerprintView {
  /** Unique among the views. */
  id: string;
  /** The switch's button text. */
  label: string;
  /** Which dimension drives what in this view. */
  encoding: FingerprintEncoding;
}

/** Props of `FingerprintViewSwitch`. */
export interface FingerprintViewSwitchProps {
  /** The views, in button order. */
  views: readonly FingerprintView[];
  /** The active view's id. */
  value: string;
  /** Called with a view's id when its button is pressed. */
  onChange: (viewId: string) => void;
  /** The group's accessible name. Defaults to "View". */
  label?: string;
  /** Extra class on the group. */
  className?: string;
}

/** One pressed button per view. */
export function FingerprintViewSwitch({
  views,
  value,
  onChange,
  label = "View",
  className,
}: FingerprintViewSwitchProps) {
  return (
    <div role="group" aria-label={label} className={join("fp-views", className)}>
      {views.map((view) => (
        <button
          key={view.id}
          type="button"
          className="fp-views__view"
          aria-pressed={view.id === value}
          onClick={() => onChange(view.id)}
        >
          {view.label}
        </button>
      ))}
    </div>
  );
}

const isSelected = (
  selected: FingerprintSelection | null,
  group: FingerprintLegendGroup,
  id: string,
) => selected?.dimensionId === group.dimensionId && selected.categoryId === id;

/** Props of `FingerprintLegend`. `useFingerprint`'s `legendProps(group)` supplies most of them. */
export interface FingerprintLegendProps {
  /** One dimension's legend, from `layout.legends`. */
  group: FingerprintLegendGroup;
  /** The current selection, from `useFingerprint`. */
  selected?: FingerprintSelection | null;
  /** Called with a category of this group, or null to clear; makes each entry a toggle. */
  onSelect?: (selection: FingerprintSelection | null) => void;
  /** Extra class on the outer element. */
  className?: string;

  /** Draws each entry's swatch; use the canvas's renderer so they match. Defaults to `shapesRenderer`. */
  renderer?: FingerprintRenderer;
  /** Show the dimension's label above its entries. Defaults to true. */
  heading?: boolean;
  /** Show each category's count. Defaults to true. */
  counts?: boolean;
  /** Leave out categories with no items. Defaults to false. */
  hideEmpty?: boolean;
}

/**
 * One dimension's categories, each drawn as a mark of it would be in the properties this dimension
 * drives (a colour swatch for colour, a neutral shape for shape, a fading tone for lightness), and
 * each a toggle that selects it in the canvas. Render one per `layout.legends` group: the legends
 * are how a keyboard reaches a category, and what names it.
 */
export function FingerprintLegend({
  group,
  renderer = shapesRenderer,
  selected = null,
  onSelect,
  heading = true,
  counts = true,
  hideEmpty = false,
  className,
}: FingerprintLegendProps) {
  const uid = useId().replace(/[^\w-]/g, "");
  const headingId = `${uid}-heading`;
  return (
    <div className={join("fp-legend", className)} data-channels={group.channels.join(" ")}>
      {heading && (
        <p id={headingId} className="fp-legend__heading">
          {group.label}
        </p>
      )}
      <ul
        aria-labelledby={heading ? headingId : undefined}
        aria-label={heading ? undefined : group.label}
        style={{ listStyle: "none", padding: 0, margin: 0 }}
      >
        {group.entries
          .filter((entry) => !hideEmpty || entry.count > 0)
          .map((entry, index) => {
            const prefix = `${uid}-${index}`;
            const swatch = (
              <svg
                viewBox="-7 -7 14 14"
                width="1em"
                height="1em"
                aria-hidden="true"
                className="fp-legend__swatch"
              >
                {renderer.defs && (
                  <defs>{renderer.defs({ idPrefix: prefix, legends: [group] })}</defs>
                )}
                {renderer.mark({
                  node: {
                    id: entry.id,
                    itemIds: [],
                    categories: { [group.dimensionId]: entry.id },
                    x: 0,
                    y: 0,
                    rotation: 0,
                    size: 12,
                    weight: 1,
                    color: entry.color,
                    shape: entry.shape,
                    lightness: entry.lightness,
                  },
                  idPrefix: prefix,
                })}
              </svg>
            );
            const text = (
              <>
                {swatch}
                <span className="fp-legend__label">{entry.label}</span>
                {counts && (
                  <span className="fp-legend__count">{entry.count.toLocaleString("en-GB")}</span>
                )}
              </>
            );
            return (
              <li key={entry.id} className="fp-legend__entry">
                {onSelect ? (
                  <button
                    type="button"
                    className="fp-legend__toggle"
                    aria-pressed={isSelected(selected, group, entry.id)}
                    onClick={() =>
                      onSelect(
                        isSelected(selected, group, entry.id)
                          ? null
                          : { dimensionId: group.dimensionId, categoryId: entry.id },
                      )
                    }
                  >
                    {text}
                  </button>
                ) : (
                  text
                )}
              </li>
            );
          })}
      </ul>
    </div>
  );
}

/** Props of `FingerprintList`. `useFingerprint`'s `listProps(group)` supplies most of them. */
export interface FingerprintListProps {
  /** One dimension's legend, from `layout.legends`. */
  group: FingerprintLegendGroup;
  /** The current selection, from `useFingerprint`. */
  selected?: FingerprintSelection | null;
  /** Called with a category of this group, or null to clear; makes each entry a toggle. */
  onSelect?: (selection: FingerprintSelection | null) => void;
  /** Extra class on the outer element. */
  className?: string;

  /** What one item is, e.g. "sets". Defaults to "items". */
  unit?: string;
  /** Text for each category's link, when it has an `href`. Defaults to "Explore". */
  linkLabel?: string;
}

/**
 * One dimension as a table: every category with its exact count and share. Render one per
 * `layout.legends` group: together they are the accessible equivalent of the drawing, and the place
 * a callout's claim can be checked.
 */
export function FingerprintList({
  group,
  unit = "items",
  linkLabel = "Explore",
  selected = null,
  onSelect,
  className,
}: FingerprintListProps) {
  // Every group counts every item once, so its entries sum to the whole collection.
  const total = group.entries.reduce((sum, entry) => sum + entry.count, 0);
  const share = (count: number) => (total ? `${Math.round((count / total) * 100)}%` : "–");
  const links = group.entries.some((entry) => entry.href);
  return (
    <table className={join("fp-list", className)}>
      <caption>
        {group.label}: {total.toLocaleString("en-GB")} {unit}
      </caption>
      <thead>
        <tr>
          <th scope="col">{group.label}</th>
          <th scope="col">{unit[0]!.toUpperCase() + unit.slice(1)}</th>
          <th scope="col">Share</th>
          {links && (
            <th scope="col">
              <span className="fp-list__hidden">Link</span>
            </th>
          )}
        </tr>
      </thead>
      <tbody>
        {group.entries.map((entry) => (
          <tr key={entry.id} data-selected={isSelected(selected, group, entry.id) || undefined}>
            <th scope="row">
              {onSelect ? (
                <button
                  type="button"
                  className="fp-list__toggle"
                  aria-pressed={isSelected(selected, group, entry.id)}
                  onClick={() =>
                    onSelect(
                      isSelected(selected, group, entry.id)
                        ? null
                        : { dimensionId: group.dimensionId, categoryId: entry.id },
                    )
                  }
                >
                  {entry.label}
                </button>
              ) : (
                entry.label
              )}
            </th>
            <td>{entry.count.toLocaleString("en-GB")}</td>
            <td>{share(entry.count)}</td>
            {links && (
              <td>
                {entry.href && (
                  <a href={entry.href}>
                    {linkLabel}
                    <span className="fp-list__hidden"> {entry.label}</span>
                  </a>
                )}
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
