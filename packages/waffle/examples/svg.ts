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
