# @data-profile/fingerprint

Draw any collection as a fingerprint: one mark per item, laid along the ridges of a real-looking
fingerprint, grouped and coloured by whatever you know about the items. A library by genre, a
record collection by decade, a garden by plant family. The print's form comes from the data
itself, so every collection gets its own, and it stays the same each time you draw it.

It is not device or browser fingerprinting: nothing here identifies anyone.

**[Documentation and live demos](https://sirkettle.github.io/data-profile/)**

- **Deterministic.** The same items always draw the same print, in any order, at any size.
- **Honest.** Mark area is the item's weight, unknown values are drawn rather than dropped, and when
  there are more items than marks, the print says how many items each mark stands for.
- **Several things at once.** Colour, shape and lightness can each show a different property.
- **Your own marks.** Simple shapes by default; a renderer can draw anything in SVG.
- **Small.** No runtime dependencies. The layout works without React; the components need React 18
  or 19.

## Install

```sh
npm install @data-profile/fingerprint
```

## A first fingerprint

<!-- example: first-fingerprint.tsx -->

```tsx
import type { FingerprintDimension, FingerprintItem } from "@data-profile/fingerprint";
import {
  FingerprintCanvas,
  FingerprintLegend,
  useFingerprint,
} from "@data-profile/fingerprint/react";
import "@data-profile/fingerprint/styles.css";

const dimensions: FingerprintDimension[] = [
  {
    id: "genre",
    label: "Genre",
    categories: [
      { id: "fiction", label: "Fiction" },
      { id: "poetry", label: "Poetry" },
      { id: "history", label: "History" },
    ],
  },
];

const items: FingerprintItem[] = [
  { id: "b1", values: { genre: "fiction" } },
  { id: "b2", values: { genre: "poetry" } },
  { id: "b3", values: { genre: "fiction" } },
  { id: "b4", values: { genre: null } }, // unknown: drawn, in its own category
];

export function Library() {
  const fp = useFingerprint({ items, dimensions, unit: "books" });
  return (
    <div style={{ maxWidth: 420 }}>
      <FingerprintCanvas {...fp.canvasProps} title="My library" />
      {fp.layout.legends.map((group) => (
        <FingerprintLegend key={group.dimensionId} {...fp.legendProps(group)} />
      ))}
    </div>
  );
}
```

The canvas is an SVG that fills its container's width. The stylesheet is optional: it styles the
legend, list and view switch, and everything works without it.

`fp.canvasProps` carries the layout, its description, the selection and the unit, and
`fp.legendProps(group)` the legend group and the selection, so clicking a legend entry or a mark
selects a category everywhere at once.

## Items and dimensions

An **item** is one thing in the collection: a unique, stable `id`, an optional `weight` (mark area
is proportional to it; the default is 1), and its category in each dimension, by id, in `values`.

A **dimension** is one way of grouping the items: an `id`, a `label` and its `categories` in the
order you want them drawn. A category can carry its own `color` and an `href`. Mark a dimension
`ordered: true` when its categories run in a meaningful order, such as decades or sizes.

A value that is `null`, `undefined`, missing, or not one of the dimension's categories counts as
**unknown**. Unknown items are drawn, last, in their own category (labelled by `unknownLabel`,
default "Unknown").

**Treat the items array as immutable.** The layout caches work against the array you pass, so a
changed collection should be a new array, as React state usually is.

## Encodings: what each property shows

One dimension **arranges** the marks: it sets the order along the ridges, so its categories form
runs. **Colour**, **shape** and **lightness** can each show a dimension too:

<!-- example: encoding.ts -->

```ts
import type { FingerprintEncoding } from "@data-profile/fingerprint";

export const encoding: FingerprintEncoding = {
  arrange: "genre",
  color: "genre",
  shape: "state",
  lightness: "decade",
};
```

- Leave `color` and `shape` out and they follow `arrange`; set one to `null` to turn it off.
- **Lightness needs an ordered dimension**: the first category is faintest. On unordered categories
  fainter and stronger would read as less and more, so that is an error.
- Colour stays distinguishable to about 10 categories and the default shapes to 5; beyond those,
  `layout.warnings` says so and only the legend tells them apart.
- Size is never an encoding: mark area is reserved for weight.

### Views

A **view** is a named encoding. Pass several to `useFingerprint` and switch between them with
`FingerprintViewSwitch`. Marks glide to their new places, and the ridges stay put.

<!-- example: views.tsx -->

```tsx
import type { FingerprintDimension, FingerprintItem } from "@data-profile/fingerprint";
import {
  FingerprintCanvas,
  FingerprintViewSwitch,
  useFingerprint,
  type FingerprintView,
} from "@data-profile/fingerprint/react";

const views: FingerprintView[] = [
  {
    id: "all",
    label: "Combined",
    encoding: { arrange: "genre", color: "genre", shape: "state", lightness: "decade" },
  },
  { id: "genre", label: "Genre", encoding: { arrange: "genre" } },
  { id: "decade", label: "Decade", encoding: { arrange: "decade" } },
];

export function Shelves({
  items,
  dimensions,
}: {
  items: FingerprintItem[];
  dimensions: FingerprintDimension[];
}) {
  const fp = useFingerprint({ items, dimensions, views, unit: "books" });
  return (
    <>
      <FingerprintViewSwitch views={fp.views} value={fp.viewId} onChange={fp.setViewId} />
      <FingerprintCanvas {...fp.canvasProps} title="My library" />
    </>
  );
}
```

With no `views`, there is one per dimension.

## The print's form

Fingerprints come in three patterns: **loop**, **whorl** and **arch**. `formFromItems(items,
dimensions)`, which `useFingerprint` uses, picks one from the data (an arch under 12 items, a loop
when one category of the first dimension holds 40% or more, otherwise a whorl) and places the core
from where the second and third dimensions' values sit. It changes in coarse steps, so a collection
keeps its print as it grows by an item or two. Pass `form` to override any part of it.

("Form" is the print's geometry. A mark's _shape_ is an encoding, above.)

## Selection, legends and lists

A selection is a category _of a dimension_, so choosing "Unread" in a shape legend highlights unread
items whatever their colour. Choose a category in a legend, a list or by clicking a mark; choose it
again to clear. The canvas dims everything else, and announces the choice to screen readers.

`FingerprintList` is one dimension as a table: every category with its count and share. Render one
per legend group with `{...fp.listProps(group)}`; together they are the accessible equivalent of the
drawing.

## Callouts

`annotations` pins short notes to the print. You write the words; the canvas points a leader at a
real mark of the categories you name:

<!-- example: annotations.ts -->

```ts
import type { FingerprintAnnotation } from "@data-profile/fingerprint";

export const annotations: FingerprintAnnotation[] = [
  {
    id: "lead",
    dimensionId: "genre",
    categoryIds: ["fiction"],
    title: "Mostly fiction",
    body: "62% of the library.",
  },
];
```

Callouts sit beside the print when its container is at least `callouts.breakpoint` wide (640 px by
default) and are numbered beneath it otherwise; `callouts.placement` can force either.

## Renderers

A renderer draws one mark, centred on the origin, `node.size` across, with the ridge running along
the x axis; the canvas positions and rotates it. Each mark arrives with its properties resolved:

| `node.`                     | Holds                                                                                                                                   |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `color`                     | The colour dimension's colour for it, or `currentColor` when nothing drives colour                                                      |
| `shape`                     | The index of its category in the shape dimension (0, 1, 2, …); `0` when nothing drives shape; `null` when its shape category is unknown |
| `lightness`                 | 0 (faintest) to 1 along the lightness dimension, or `null`. `markOpacity(node)` turns it into an opacity                                |
| `categories`                | Its category in every encoded dimension, by dimension id                                                                                |
| `size`, `weight`, `itemIds` | Its footprint, summed weight and the items it stands for                                                                                |

<!-- example: renderer.tsx -->

```tsx
import { markOpacity } from "@data-profile/fingerprint";
import type { FingerprintRenderer } from "@data-profile/fingerprint/react";

const glyphs = ["★", "●", "■", "▲", "◆"];

export const stars: FingerprintRenderer = {
  name: "stars",
  mark: ({ node }) => (
    <text
      fontSize={node.size}
      textAnchor="middle"
      dy="0.35em"
      fill={node.color}
      opacity={markOpacity(node)}
    >
      {node.shape === null ? "?" : glyphs[node.shape % glyphs.length]}
    </text>
  ),
};
```

`shapesRenderer` (the default, five shapes) and `dotsRenderer` come with the package. A renderer can
also return SVG `defs` once per drawing. Marks are memoised, so a renderer must depend on its props
alone.

## Large collections and motion

At most about `maxMarks` marks are drawn (600 by default). Above that, neighbouring items that
agree on every encoded dimension share a mark, `layout.itemsPerMark` says how many, and the
description says so too. Nothing is sampled away.

Marks glide between views while there are at most `motion.glide` of them (800) and recolour gently
up to `motion.fade` (400); above those they change at once, because SVG cannot animate more marks
smoothly. Under `prefers-reduced-motion` nothing animates.

Ridges are drawn faintly behind small collections, where the marks alone would not read as a
fingerprint; `ridges={{ show: "always" }}` or `"never"` overrides that.

## Without React

<!-- example: headless.ts -->

```ts
import {
  describeLayout,
  formFromItems,
  layoutFingerprint,
  type FingerprintDimension,
  type FingerprintItem,
} from "@data-profile/fingerprint";

export function summarise(items: FingerprintItem[], dimensions: FingerprintDimension[]) {
  const layout = layoutFingerprint({
    items,
    dimensions,
    encoding: { arrange: "genre" },
    form: formFromItems(items, dimensions),
    maxMarks: 600,
  });
  return {
    description: describeLayout(layout, "books"),
    pattern: layout.form.pattern,
    marks: layout.nodes.length,
    warnings: layout.warnings,
  };
}
```

`layout.nodes` are the positioned marks, `layout.legends` one legend per encoded dimension,
`layout.ridges` the ridge polylines, all in a fixed `layout.width` × `layout.height` frame.
`layoutFingerprint` throws `FingerprintDataError` on data it cannot draw truthfully (duplicate ids,
lightness on an unordered dimension, …); `useFingerprint` returns it as `fp.error` instead.

## Reference

### `useFingerprint(options)`

| Option                |                                     | Default           |
| --------------------- | ----------------------------------- | ----------------- |
| `items`, `dimensions` | The data                            | required          |
| `views`               | Named encodings, in switcher order  | one per dimension |
| `initialViewId`       | The view shown first                | the first         |
| `form`                | Overrides parts of the derived form | from the data     |
| `seed`                | Varies the form's free parts        | `"fingerprint"`   |
| `maxMarks`            | The mark cap                        | 600               |
| `unit`                | What one item is ("books")          | `"items"`         |

Returns `layout`, `description`, `error`, `views`, `view`, `viewId`, `setViewId`, `selected`,
`setSelected`, and the bundles `canvasProps`, `legendProps(group)` and `listProps(group)`.

### `<FingerprintCanvas>`

| Prop                                                    |                                                                      | Default          |
| ------------------------------------------------------- | -------------------------------------------------------------------- | ---------------- |
| `layout`, `description`, `selected`, `onSelect`, `unit` | From `fp.canvasProps`                                                |                  |
| `title`                                                 | The drawing's accessible name                                        | required         |
| `renderer`                                              | Draws each mark                                                      | `shapesRenderer` |
| `annotations`                                           | Callouts                                                             | none             |
| `callouts`                                              | `{ placement?: "auto" \| "beside" \| "below", breakpoint?: number }` | `auto`, 640      |
| `motion`                                                | `{ glide?: number, fade?: number }`                                  | 800, 400         |
| `ridges`                                                | `{ show?, fadeFrom?, fadeTo?, opacity?, color?, width? }`            | `show: "auto"`   |
| `className`                                             | Extra class                                                          |                  |

### `<FingerprintLegend>` and `<FingerprintList>`

Both take `group`, `selected` and `onSelect` (from `fp.legendProps(group)` or `fp.listProps(group)`)
and a `className`. The legend also takes `renderer` (match the canvas), `heading`, `counts` and
`hideEmpty`; the list takes `unit` and `linkLabel`.

### `<FingerprintViewSwitch>`

`views`, `value` (the active id), `onChange`, and an accessible `label` (default "View").

## Styling

The components are unstyled apart from what layout needs, and every part has an `fp-` class:
`fp-canvas`, `fp-mark`, `fp-legend`, `fp-legend__toggle`, `fp-list`, `fp-views__view` and others.
The optional `@data-profile/fingerprint/styles.css` styles them neutrally; theme it with
`--fp-accent`, `--fp-accent-text`, `--fp-muted`, `--fp-border` and `--fp-radius`.

## Licence

MIT
