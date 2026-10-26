# @data-profile/react

The React pieces every [data-profile](https://github.com/SirKettle/data-profile) view shares. You
get them through a view's `./react` entry, such as
[`@data-profile/fingerprint/react`](../fingerprint) or [`@data-profile/waffle/react`](../waffle);
install this package directly only to build a view of your own.

- **`MarkCanvas`** draws any view's placed marks as one accessible SVG image. Marks glide to their
  new places when the view changes (not under reduced motion), marks outside a selection dim, and a
  live region announces the selection. Selection and motion are CSS: a selection re-renders no
  marks. A view adds its own layers under and over the marks.
- **`Legend`**, **`CategoryList`** and **`ViewSwitch`** explain and control a view: each legend entry
  and list row is a keyboard-reachable toggle that selects its category.
- **`useViews`** holds the active view and the selection, with prop bundles for the controls.
- **`shapesRenderer`** and **`dotsRenderer`** draw marks; a `Renderer` of your own can draw anything
  in SVG, and works with every view.

## Install

```sh
npm install @data-profile/react @data-profile/core react
```

## Styles

`@data-profile/react/styles.css` styles the legend, list and view switch; a view's own stylesheet
includes it. Neutral by default; theme it through custom properties on any ancestor:

| Property           | For                                    |
| ------------------ | -------------------------------------- |
| `--dp-accent`      | Pressed buttons, focus rings, selected |
| `--dp-accent-text` | Text on the accent                     |
| `--dp-muted`       | Counts, headings, captions             |
| `--dp-border`      | Button and table rules                 |
| `--dp-radius`      | Button corners                         |

## Licence

[MIT](LICENSE)
