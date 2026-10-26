import { encodeProfile } from "@data-profile/core";
import type { WaffleCell, WaffleInput, WaffleLayout } from "./types";

/** The frame is always this wide; its height follows the rows. */
const WIDTH = 400;
const DEFAULTS = { maxMarks: 1000, gap: 0.15 } as const;

/** A usable count, or undefined for anything else (undefined, NaN, zero, negative). */
const positive = (value: number | undefined) =>
  value !== undefined && Number.isFinite(value) && value >= 1 ? Math.floor(value) : undefined;

/**
 * Lays the items out as a waffle: a grid of cells, filled left to right and top to bottom in core's
 * mark order, so each category of the arranging dimension is a run you can read like text.
 *
 * `encoding` works as everywhere in data-profile (see core's `Encoding`). Cell **area** is
 * proportional to weight: the heaviest mark fills its cell, less the gap. Positions only arrange.
 *
 * A pure function of its input: the same items, dimensions, encoding and options give the same
 * layout whatever order the items arrive in and whatever size it is drawn at. Above `maxMarks`
 * items, a cell stands for several items that agree on every encoded dimension; nothing is dropped.
 */
export function layoutWaffle(input: WaffleInput): WaffleLayout {
  const { items, dimensions, encoding } = input;
  const maxMarks = positive(input.maxMarks) ?? DEFAULTS.maxMarks;
  const gap = Math.min(0.9, Math.max(0, input.gap ?? DEFAULTS.gap));
  const { marks, ...profile } = encodeProfile({ items, dimensions, encoding, maxMarks });

  const columns = positive(input.columns) ?? Math.max(1, Math.ceil(Math.sqrt(marks.length)));
  const rows = Math.ceil(marks.length / columns);
  const pitch = WIDTH / columns;
  const heaviest = Math.max(0, ...marks.map((mark) => mark.weight));
  const cells: WaffleCell[] = marks.map((mark, i) => {
    const column = i % columns;
    const row = Math.floor(i / columns);
    return {
      ...mark,
      x: (column + 0.5) * pitch,
      y: (row + 0.5) * pitch,
      size: pitch * (1 - gap) * Math.sqrt(mark.weight / heaviest),
      column,
      row,
    };
  });

  // An empty grid keeps one row's height, so a drawing of it never collapses to nothing.
  return {
    width: WIDTH,
    height: Math.max(1, rows) * pitch,
    ...profile,
    cells,
    columns,
    rows,
    pitch,
  };
}
