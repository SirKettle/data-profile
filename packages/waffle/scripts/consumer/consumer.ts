// What a consumer writes, compiled against the *installed* packages and run under plain Node. No
// JSX, so it runs without a bundler; both entries are imported.
import { DataError, describeProfile, type Dimension, type Item } from "@data-profile/core";
import { layoutWaffle, type WaffleLayout } from "@data-profile/waffle";
import { Legend, WaffleCanvas, type Renderer } from "@data-profile/waffle/react";
import { shapesRenderer } from "@data-profile/react";
import { createElement } from "react";
import { renderToString } from "react-dom/server";

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
const description = describeProfile(layout, "books");
// The shared package's renderer draws a waffle as it is.
const renderer: Renderer = shapesRenderer;
const html = renderToString(
  createElement(
    "div",
    null,
    createElement(WaffleCanvas, { layout, description, title: "Library", renderer }),
    createElement(Legend, { group: layout.legends[0]! }),
  ),
);
const drawn = (html.match(/class="dp-mark"/g) ?? []).length;
if (drawn !== 30) throw new Error(`expected 30 cells drawn, rendered ${drawn}`);
if (!html.includes(description)) throw new Error("the description is missing");
console.log(`consumer: ${drawn} cells: ${description}`);
