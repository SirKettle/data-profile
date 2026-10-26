// What a consumer writes, compiled against the *installed* package and run under plain Node. No
// JSX, so it runs without a bundler; both entries are imported.
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import {
  describeLayout,
  FingerprintDataError,
  formFromItems,
  layoutFingerprint,
  type FingerprintDimension,
  type FingerprintItem,
} from "@data-profile/fingerprint";
import {
  FingerprintCanvas,
  FingerprintLegend,
  shapesRenderer,
  type FingerprintRenderer,
} from "@data-profile/fingerprint/react";

const dimensions: FingerprintDimension[] = [
  {
    id: "genre",
    label: "Genre",
    categories: [
      { id: "fiction", label: "Fiction" },
      { id: "poetry", label: "Poetry" },
    ],
  },
];
const items: FingerprintItem[] = Array.from({ length: 30 }, (_, i) => ({
  id: `b${i}`,
  values: { genre: i % 3 === 0 ? "poetry" : i % 7 === 0 ? null : "fiction" },
}));

const layout = layoutFingerprint({ items, dimensions, form: formFromItems(items, dimensions) });
const description = describeLayout(layout, "books");
const renderer: FingerprintRenderer = shapesRenderer;
const html = renderToString(
  createElement(
    "div",
    null,
    createElement(FingerprintCanvas, { layout, description, title: "Library", renderer }),
    createElement(FingerprintLegend, { group: layout.legends[0]! }),
  ),
);

// Marks carry the shared `dp-mark` class and the fingerprint's own `fp-mark`.
const marks = (html.match(/class="dp-mark fp-mark"/g) ?? []).length;
if (marks !== 30) throw new Error(`expected 30 marks, rendered ${marks}`);
if (!html.includes(description)) throw new Error("the description is missing");
try {
  layoutFingerprint({ items: [items[0]!, items[0]!], dimensions });
  throw new Error("duplicate ids were accepted");
} catch (error) {
  if (!(error instanceof FingerprintDataError)) throw error;
}
console.log(`consumer: ${marks} marks, a ${layout.form.pattern}: ${description}`);
