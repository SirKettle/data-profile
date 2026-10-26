# @data-profile/core

What every [data-profile](https://github.com/SirKettle/data-profile) view shares. It turns a
categorical dataset into **marks**: one per item, in a meaningful order, each with its colour,
shape and lightness worked out, plus the legends that explain them. It does not place them: a view
package, such as [`@data-profile/fingerprint`](../fingerprint), gives each mark a position.

You only need this package directly to build a view of your own, or to work with the data types.

- **Deterministic.** The same items give the same marks, in the same order, whatever order they
  arrive in.
- **Honest.** Unknown values are kept, never dropped; mark weight is the items' summed weight; and
  above a cap, a mark only ever stands for items that agree on every encoded dimension.
- **Tiny.** No dependencies and no React.

## Install

```sh
npm install @data-profile/core
```

## Use

<!-- example: encode.ts -->

```ts
import { describeProfile, encodeProfile, type Dimension, type Item } from "@data-profile/core";

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
const items: Item[] = [
  { id: "a", values: { genre: "fiction" } },
  { id: "b", values: { genre: "poetry" } },
  { id: "c", values: { genre: null } },
];

const profile = encodeProfile({ items, dimensions, maxMarks: 600 });
profile.marks; // ordered: fiction, poetry, then unknown, each with color, shape and lightness
profile.legends; // one group per encoded dimension, with counts
describeProfile(profile, "books"); // "3 books by genre: Fiction 1, Poetry 1, Unknown 1."
```

A view lays `profile.marks` out in order, makes each mark's area proportional to `mark.weight`,
and draws `mark.color`, `mark.shape` and `mark.lightness` (see `markOpacity`).

## Licence

[MIT](LICENSE)
