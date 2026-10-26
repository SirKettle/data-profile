import type { FingerprintAnnotation, FingerprintLayout } from "./types";

/** Horizontal room either side of the print for callout labels, in layout units. */
export const CALLOUT_GUTTER = 190;
/** How far apart two callouts' anchors stay: a numbered marker is 22 units across. */
const ANCHOR_CLEARANCE = 28;
/** Vertical room one callout label takes, in layout units. */
export const CALLOUT_HEIGHT = 96;

/** Where `placeCallouts` puts one annotation, in the layout's frame. */
export interface PlacedCallout {
  /** The annotation placed. */
  annotation: FingerprintAnnotation;
  /** The mark the leader points at: the named categories' mark nearest their centre. */
  anchor: { x: number; y: number };
  /** Which gutter the label sits in: the side of the print its anchor is on. */
  side: "left" | "right";
  /** Top of the label, in layout units. */
  labelY: number;
  /** 1-based, in reading order: left side top to bottom, then right. */
  number: number;
}

/**
 * Where each callout goes. Its anchor is a real mark of the categories it names, so the leader
 * never points at empty paper; the label sits in the gutter on the anchor's side, as level with it
 * as the other labels allow. Annotations whose categories have no marks are left out.
 */
export function placeCallouts(
  layout: FingerprintLayout,
  annotations: readonly FingerprintAnnotation[],
): PlacedCallout[] {
  // Anchors already taken: a later callout's anchor keeps this far from them, so numbered markers
  // never hide each other.
  const taken: { x: number; y: number }[] = [];
  const anchored = annotations.flatMap((annotation) => {
    const wanted = new Set(annotation.categoryIds);
    const dimensionId = annotation.dimensionId ?? layout.encoding.arrange;
    const marks = layout.nodes.filter((node) => wanted.has(node.categories[dimensionId] ?? ""));
    if (marks.length === 0) return [];
    const cx = marks.reduce((sum, node) => sum + node.x, 0) / marks.length;
    const cy = marks.reduce((sum, node) => sum + node.y, 0) / marks.length;
    const byCloseness = [...marks].sort(
      (a, b) => Math.hypot(a.x - cx, a.y - cy) - Math.hypot(b.x - cx, b.y - cy),
    );
    const clear = (node: { x: number; y: number }) =>
      taken.every((t) => Math.hypot(node.x - t.x, node.y - t.y) >= ANCHOR_CLEARANCE);
    const anchor = byCloseness.find(clear) ?? byCloseness[0]!;
    taken.push(anchor);
    const side: PlacedCallout["side"] = anchor.x < layout.width / 2 ? "left" : "right";
    return [{ annotation, anchor: { x: anchor.x, y: anchor.y }, side }];
  });

  const placed: PlacedCallout[] = [];
  for (const side of ["left", "right"] as const) {
    const column = anchored.filter((c) => c.side === side).sort((a, b) => a.anchor.y - b.anchor.y);
    // Level with the anchor where possible, pushed down to clear the label above, then the whole
    // column pulled back up if the last label would run off the bottom.
    const tops: number[] = [];
    for (const callout of column)
      tops.push(
        Math.max(
          callout.anchor.y - CALLOUT_HEIGHT / 3,
          (tops.at(-1) ?? -Infinity) + CALLOUT_HEIGHT,
        ),
      );
    const overflow = Math.max(0, (tops.at(-1) ?? 0) + CALLOUT_HEIGHT - layout.height);
    column.forEach((callout, i) =>
      placed.push({ ...callout, labelY: Math.max(0, tops[i]! - overflow), number: 0 }),
    );
  }
  return placed.map((callout, i) => ({ ...callout, number: i + 1 }));
}
