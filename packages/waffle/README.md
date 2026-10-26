# @data-profile/waffle

Draw any categorical dataset as a waffle: one cell per item in a grid, filled left to right and top
to bottom, so each category is a run you can read like a line of text. Colour, shape and lightness
can each show a different property of the items.

It is one view of [data-profile](https://github.com/SirKettle/data-profile), built on
[`@data-profile/core`](../core); the same data draws as a
[fingerprint](../fingerprint) too.

- **Deterministic.** The same items always fill the same cells, in any order, at any size.
- **Honest.** Cell area is the item's weight, unknown values get cells rather than being dropped,
  and above 1,000 items a cell says how many items it stands for.
- **Yours to draw.** The layout is plain data: cell centres, sizes and colours in a fixed frame.
  Render it with SVG, canvas or anything else.

## Install

```sh
npm install @data-profile/waffle @data-profile/core
```

## Draw one

<!-- example: svg.ts -->

```ts
import { describeProfile, markOpacity, type Dimension, type Item } from "@data-profile/core";
import { layoutWaffle } from "@data-profile/waffle";

const dimensions: Dimension[] = [
  {
    id: "genre",
    label: "Genre",
    categories: [
      { id: "fiction", label: "Fiction" },
      { id: "poetry", label: "Poetry" },
    ],
  },
];
const items: Item[] = Array.from({ length: 100 }, (_, i) => ({
  id: `book-${i}`,
  values: { genre: i < 62 ? "fiction" : i < 90 ? "poetry" : null },
}));

// Ten across: one cell per percent.
const layout = layoutWaffle({ items, dimensions, columns: 10 });

const cells = layout.cells
  .map(
    (cell) =>
      `<rect x="${cell.x - cell.size / 2}" y="${cell.y - cell.size / 2}" width="${cell.size}" ` +
      `height="${cell.size}" fill="${cell.color}" fill-opacity="${markOpacity(cell)}" />`,
  )
  .join("");
export const svg =
  `<svg viewBox="0 0 ${layout.width} ${layout.height}" role="img">` +
  `<title>${describeProfile(layout, "books")}</title>${cells}</svg>`;
```

## Options

| Option     | Default                            | What it does                                              |
| ---------- | ---------------------------------- | --------------------------------------------------------- |
| `encoding` | the first dimension does all three | Which dimension arranges, colours, shapes and fades cells |
| `columns`  | a square grid                      | Cells per row                                             |
| `gap`      | `0.15`                             | Space between cells, as a share of the cell pitch         |
| `maxMarks` | `1000`                             | Above this many items, a cell stands for several          |

## Licence

[MIT](LICENSE)
