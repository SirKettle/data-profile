// What a consumer writes, compiled against the *installed* packages and run under plain Node.
import { DataError, describeProfile, type Dimension, type Item } from "@data-profile/core";
import { layoutWaffle, type WaffleLayout } from "@data-profile/waffle";

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
const items: Item[] = Array.from({ length: 30 }, (_, i) => ({
  id: `b${i}`,
  values: { genre: i % 3 === 0 ? "poetry" : i % 7 === 0 ? null : "fiction" },
}));

const layout: WaffleLayout = layoutWaffle({ items, dimensions, columns: 10 });
if (layout.cells.length !== 30 || layout.rows !== 3)
  throw new Error(`expected 30 cells in 3 rows, got ${layout.cells.length} in ${layout.rows}`);
try {
  layoutWaffle({ items: [items[0]!, items[0]!], dimensions });
  throw new Error("duplicate ids were accepted");
} catch (error) {
  if (!(error instanceof DataError)) throw error;
}
console.log(`consumer: ${layout.cells.length} cells: ${describeProfile(layout, "books")}`);
