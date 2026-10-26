# Contributing

Thank you for helping. Issues and pull requests are welcome; for anything larger than a fix, open
an issue first so we can agree the shape before you build it.

## The repository

A Bun workspace. Each package under `packages/` is published to npm on its own:

- `packages/core`: `@data-profile/core`, what every view shares: the data types, `encodeProfile`
  (validation, encoding, ordering, the mark cap, legends) and `describeProfile`. No dependencies,
  no React, and nothing about how marks are placed.
- `packages/react`: `@data-profile/react`, the React pieces every view shares: `MarkCanvas` (placed
  marks with motion and selection), `Legend`, `CategoryList`, `ViewSwitch`, `useViews`, the
  renderers and the `dp-` stylesheet. Knows no view.
- `packages/fingerprint`: `@data-profile/fingerprint`, a view. It places core's marks along
  fingerprint ridges; its `./react` adds the ridges and callouts to `MarkCanvas`.
- `packages/waffle`: `@data-profile/waffle`, a view. It places core's marks in a grid, in reading
  order; its `./react` draws them with `MarkCanvas`.

A view's layout depends on core alone, and its `./react` entry adds `@data-profile/react`; a view
never depends on another view, and imports packages by name. Each package's
`src/architecture.test.ts` enforces it. Inside the workspace, `tsconfig.base.json` maps every
package name to its source, so nothing needs building to test or typecheck. Packages with React
build through `scripts/build-package.ts`.

`site/` is the documentation site; its demos import the packages from source. `stories/` is a
[Ladle](https://ladle.dev) workspace with stories for every view, also against source: add a
`src/<view>.stories.tsx` there when you add a view.

## The loop

Run from the root, these cover every package; run inside `packages/<name>` for just that one.

```sh
bun install
bun test             # unit, component, boundary and README-example tests (happy-dom, no browser)
bun run typecheck    # the packages, their scripts, README examples, docs demos and stories
bun run build        # each package's dist/, checked against its API reports and size budget
bun run stories      # every view's stories in Ladle, live against the source
bun run format       # Prettier
```

Bun 1.3 or later is needed to develop the packages; consumers need only npm and Node 20+.

### Working on the package inside an app

```sh
bun run build && bun link              # in packages/fingerprint: register the package
bun link @data-profile/fingerprint     # in the app
```

Rebuild the package after each change (`bun run build`), and the app picks it up. The app imports `dist/`,
exactly as it would from npm.

## Rules the tests enforce

Paths are relative to each package.

- `src/architecture.test.ts` keeps the boundary: no consumer vocabulary, no React outside
  `src/react/`, no runtime dependencies. If a test there fails, the design has moved: talk about it
  in the pull request rather than loosening the rule quietly.
- `src/react/public-surface.test.ts` pins every runtime export and the `exports` map.
- `src/react/readme-examples.test.ts` holds every README sample marked `<!-- example: name -->` to
  the file `examples/name`, which `bun run typecheck` compiles. Change both together.

## Changing the public API

Each package's API reports in `api/` are its public contract. If your change alters what consumers can import
or call, run `bun run api:report` and commit the updated reports with it; `bun run build` (and CI)
fails if they differ. Every public member needs a doc comment.

## Commits

Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/), because
release-please writes the CHANGELOG and picks the version from them:

- `fix:` a bug fix (patch);
- `feat:` a new capability (minor);
- `feat!:` or a `BREAKING CHANGE:` footer: a breaking change. Before 1.0 this is a **minor**
  version, and the CHANGELOG entry must say what to change;
- `docs:`, `test:`, `chore:`, `build:`, `ci:` and `refactor:` do not release.

## Releasing

1. Merging to `main` makes release-please open (or update) a release pull request with the next
   version and CHANGELOG of each package a commit touched. Packages are versioned independently and
   tagged `<package>-v<version>`.
2. Merging that pull request tags the releases, and the release workflow publishes the released
   packages to npm from CI, with provenance. Nobody publishes from a laptop.
3. Before a release, run the **Release** workflow by hand (`workflow_dispatch`): it builds, checks
   and runs `npm publish --dry-run` for every package.

## Versioning

[Semantic Versioning](https://semver.org/). While the version is 0.x, a minor version may break the
API (and says how in the CHANGELOG); a patch never does. From 1.0, only a major version breaks.
The peer range in each `package.json` is the one CI tests: React 18 and 19.
