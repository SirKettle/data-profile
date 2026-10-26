/**
 * Builds the package into `dist/`, which is what `package.json` exports and `npm pack` ships:
 * JavaScript, rolled-up declarations and the stylesheet.
 *
 * - **JavaScript:** one ESM file per entry plus a shared chunk, so `.` and `./react` share one copy
 *   of the core at runtime. React is a peer, never bundled.
 * - **Types:** one rolled-up `.d.ts` per entry, from api-extractor. The `./react` declarations
 *   import the core's types from `@data-profile/fingerprint` rather than repeating them.
 *   The build **fails** if the public API differs from `api/*.api.md`: run `bun run api:report`
 *   and commit the reports when a change is meant.
 *
 *   bun run build              # check the API reports, then build
 *   bun run build --api-report # update the API reports instead of checking them
 */
import { $ } from "bun";
import { cp, mkdir, readdir, rm } from "node:fs/promises";
import { join } from "node:path";

const root = join(import.meta.dir, "..");
const dist = join(root, "dist");
const temp = join(root, "temp");
const local = process.argv.includes("--api-report");
const PEERS = ["react", "react/jsx-runtime", "react-dom"];
const NAME = "@data-profile/fingerprint";

await rm(dist, { recursive: true, force: true });
await rm(temp, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

// Declarations: emit, roll up the core, point ./react's imports of public core modules at the
// package, roll up ./react.
await $`bunx tsc -p tsconfig.api.json`.cwd(root);
const extract = (entry: string) =>
  $`bunx api-extractor run ${local ? ["--local"] : []} -c api-extractor.${entry}.json`
    .cwd(root)
    .quiet();
await extract("index");
// api-extractor leaves an import as an import only when it resolves into node_modules, so the
// core's rollup is installed there under the package's name before ./react is extracted.
const installed = join(temp, "node_modules", NAME);
await cp(join(temp, "rollup/index.d.ts"), join(installed, "index.d.ts"));
await Bun.write(
  join(installed, "package.json"),
  JSON.stringify({ name: NAME, types: "index.d.ts" }),
);
const reactDts = join(temp, "dts/react");
for (const file of await readdir(reactDts)) {
  const path = join(reactDts, file);
  const text = await Bun.file(path).text();
  await Bun.write(path, text.replace(/from "\.\.\/(types|layout|opacity)"/g, `from "${NAME}"`));
}
await extract("react");
await cp(join(temp, "rollup/index.d.ts"), join(dist, "index.d.ts"));

// JavaScript. Bundled from a copy of src/ under a manifest without `sideEffects`: Bun 1.3.14 emits
// entry points that are pure re-export barrels with no code at all when the package declares
// `sideEffects` (any value, `false` included), and our two entries are exactly that. Bun only
// treats the copy's manifest as a package boundary when it has a `name`.
const source = join(temp, "src");
await cp(join(root, "src"), source, { recursive: true });
await Bun.write(join(temp, "package.json"), '{ "name": "build-copy", "type": "module" }\n');
const result = await Bun.build({
  entrypoints: [join(source, "index.ts"), join(source, "react/index.ts")],
  outdir: dist,
  root: source,
  format: "esm",
  target: "browser",
  splitting: true,
  external: PEERS,
  // Without it Bun compiles JSX for React's development runtime (`jsxDEV`).
  define: { "process.env.NODE_ENV": '"production"' },
  naming: { entry: "[dir]/[name].js", chunk: "chunk-[hash].js" },
  sourcemap: "linked",
});
if (!result.success) {
  for (const log of result.logs) console.error(log);
  process.exit(1);
}
// Each entry must take the core from the shared chunk: an entry without that import is the
// empty-barrel failure above, and a build without a chunk would ship the core twice.
for (const output of result.outputs.filter((output) => output.kind === "entry-point"))
  if (!/from "\.\.?\/chunk-/.test(await output.text()))
    throw new Error(`build: ${output.path} does not import the shared core chunk`);
const built = await Promise.all(result.outputs.map((output) => output.text()));
if (built.some((text) => text.includes("jsxDEV")))
  throw new Error("build: JSX compiled for React's development runtime");
// `src/react/index.ts` lands at `dist/react/index.js`; the rollup sits beside it.
await cp(join(temp, "rollup/react.d.ts"), join(dist, "react/index.d.ts"));
await cp(join(root, "styles.css"), join(dist, "styles.css"));

// Size budget, gzipped: what `.` costs alone, and what `./react` adds on top of the shared core.
// Measured before 0.1.0: 8.4 KB and 14.1 KB. Raise a budget deliberately, never silently.
const BUDGET = { core: 10_000, withReact: 16_000 };
const gz = (outputs: typeof result.outputs) =>
  outputs.reduce(
    (sum, output) => sum + Bun.gzipSync(built[result.outputs.indexOf(output)]!).length,
    0,
  );
const isReact = (output: (typeof result.outputs)[number]) =>
  output.path === join(dist, "react/index.js");
const core = gz(result.outputs.filter((output) => output.path.endsWith(".js") && !isReact(output)));
const withReact = core + gz(result.outputs.filter(isReact));
console.log(
  `size: . ${(core / 1000).toFixed(1)} KB, . + ./react ${(withReact / 1000).toFixed(1)} KB gzipped`,
);
if (core > BUDGET.core || withReact > BUDGET.withReact)
  throw new Error(
    `build: over the size budget (${BUDGET.core} / ${BUDGET.withReact} bytes gzipped)`,
  );

await rm(temp, { recursive: true, force: true });
const { name, version } = await Bun.file(join(root, "package.json")).json();
console.log(`build: ${name}@${version} in dist/`);
