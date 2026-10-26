/**
 * Builds the package into `dist/`, which is what `package.json` exports and `npm pack` ships: one
 * ESM file and one rolled-up `.d.ts`, from api-extractor. The build **fails** if the public API
 * differs from `api/index.api.md`: run `bun run api:report` and commit the report when a change is
 * meant.
 *
 *   bun run build              # check the API report, then build
 *   bun run build --api-report # update the API report instead of checking it
 */
import { $ } from "bun";
import { cp, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";

const root = join(import.meta.dir, "..");
const dist = join(root, "dist");
const temp = join(root, "temp");
const local = process.argv.includes("--api-report");

await rm(dist, { recursive: true, force: true });
await rm(temp, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

await $`bunx tsc -p tsconfig.api.json`.cwd(root);
await $`bunx api-extractor run ${local ? ["--local"] : []} -c api-extractor.json`.cwd(root).quiet();
await cp(join(temp, "rollup/index.d.ts"), join(dist, "index.d.ts"));

// No `sideEffects` in the manifest: Bun 1.3.14 emits an empty entry for a pure re-export barrel
// when the package declares one (see packages/fingerprint/scripts/build.ts).
const result = await Bun.build({
  entrypoints: [join(root, "src/index.ts")],
  outdir: dist,
  format: "esm",
  target: "browser",
  naming: { entry: "[name].js" },
  sourcemap: "linked",
});
if (!result.success) {
  for (const log of result.logs) console.error(log);
  process.exit(1);
}
const built = await result.outputs.find((output) => output.kind === "entry-point")!.text();
if (!built.includes("encodeProfile")) throw new Error("build: dist/index.js is empty");

// Size budget, gzipped. Measured before the first release: 3.4 KB. Raise it deliberately, never silently.
const BUDGET = 4_000;
const size = Bun.gzipSync(built).length;
console.log(`size: ${(size / 1000).toFixed(1)} KB gzipped`);
if (size > BUDGET) throw new Error(`build: over the size budget (${BUDGET} bytes gzipped)`);

await rm(temp, { recursive: true, force: true });
const { name, version } = await Bun.file(join(root, "package.json")).json();
console.log(`build: ${name}@${version} in dist/`);
