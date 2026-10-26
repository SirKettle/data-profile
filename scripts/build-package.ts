/**
 * Builds one workspace package into its `dist/`, which is what its `package.json` exports and
 * `npm pack` ships: an ESM file per entry (sharing one chunk when there are several), a rolled-up
 * `.d.ts` per entry from api-extractor, and optionally a stylesheet. Dependencies and peers are
 * never bundled. The build **fails** if a public API differs from its `api/*.api.md` report: run
 * the package's `api:report` and commit the report when a change is meant.
 *
 * Each package's `scripts/build.ts` calls `buildPackage` with its entries, stylesheet and budget.
 * Entries are `index` (`src/index.ts`, exported as `.`) and optionally `react`
 * (`src/react/index.ts`, exported as `./react`), each with an `api-extractor.<entry>.json`.
 */
import { $ } from "bun";
import { cp, mkdir, readdir, rm } from "node:fs/promises";
import { join } from "node:path";

export interface PackageBuild {
  /** The package directory. */
  root: string;
  /** `index` first; `react` for a package with a `./react` entry. */
  entries: readonly ("index" | "react")[];
  /** Stylesheets, relative to the root, concatenated in order into `dist/styles.css`. */
  styles?: readonly string[];
  /**
   * Gzipped budgets in bytes: `index` for `.` alone, `react` for `.` plus what `./react` adds.
   * Raise one deliberately, never silently.
   */
  budget: Partial<Record<"index" | "react", number>>;
}

export async function buildPackage({ root, entries, styles = [], budget }: PackageBuild) {
  const dist = join(root, "dist");
  const temp = join(root, "temp");
  const local = process.argv.includes("--api-report");
  const manifest = await Bun.file(join(root, "package.json")).json();
  const name: string = manifest.name;
  const external = [
    ...Object.keys(manifest.dependencies ?? {}),
    ...Object.keys(manifest.peerDependencies ?? {}),
  ].flatMap((id) => (id === "react" ? ["react", "react/jsx-runtime"] : [id]));

  await rm(dist, { recursive: true, force: true });
  await rm(temp, { recursive: true, force: true });
  await mkdir(dist, { recursive: true });

  // Declarations: emit, roll up `.`, then each further entry with its imports of `.`'s modules
  // pointed at the package.
  await $`bunx tsc -p tsconfig.api.json`.cwd(root);
  const extract = (entry: string) =>
    $`bunx api-extractor run ${local ? ["--local"] : []} -c api-extractor.${entry}.json`
      .cwd(root)
      .quiet();
  await extract("index");
  if (entries.includes("react")) {
    // api-extractor leaves an import as an import only when it resolves into node_modules, so the
    // `.` rollup is installed there under the package's name before ./react is extracted.
    const installed = join(temp, "node_modules", name);
    await cp(join(temp, "rollup/index.d.ts"), join(installed, "index.d.ts"));
    await Bun.write(join(installed, "package.json"), JSON.stringify({ name, types: "index.d.ts" }));
    const reactDts = join(temp, "dts/react");
    for (const file of await readdir(reactDts)) {
      const path = join(reactDts, file);
      const text = await Bun.file(path).text();
      await Bun.write(path, text.replace(/from "\.\.\/[\w/]+"/g, `from "${name}"`));
    }
    await extract("react");
  }

  // JavaScript. Bundled from a copy of src/ under a manifest without `sideEffects`: Bun 1.3.14 emits
  // entry points that are pure re-export barrels with no code at all when the package declares
  // `sideEffects` (any value, `false` included). Bun only treats the copy's manifest as a package
  // boundary when it has a `name`.
  const source = join(temp, "src");
  await cp(join(root, "src"), source, { recursive: true });
  await Bun.write(join(temp, "package.json"), '{ "name": "build-copy", "type": "module" }\n');
  const entryFile = (entry: string) => (entry === "index" ? "index.ts" : `${entry}/index.ts`);
  const result = await Bun.build({
    entrypoints: entries.map((entry) => join(source, entryFile(entry))),
    outdir: dist,
    root: source,
    format: "esm",
    target: "browser",
    splitting: entries.length > 1,
    external,
    // Without it Bun compiles JSX for React's development runtime (`jsxDEV`).
    define: { "process.env.NODE_ENV": '"production"' },
    naming: { entry: "[dir]/[name].js", chunk: "chunk-[hash].js" },
    sourcemap: "linked",
  });
  if (!result.success) {
    for (const log of result.logs) console.error(log);
    process.exit(1);
  }
  const built = await Promise.all(result.outputs.map((output) => output.text()));
  const text = (path: string) =>
    built[result.outputs.findIndex((output) => output.path === join(dist, path))] ?? "";
  // A pure re-export barrel that comes out holding nothing is the failure described above.
  for (const entry of entries) {
    const js = text(entryFile(entry).replace(/\.ts$/, ".js"));
    if (!/\bexport\b/.test(js) || (entries.length > 1 && !/from "\.\.?\/chunk-/.test(js)))
      throw new Error(`build: the ${entry} entry is empty or does not share the chunk`);
  }
  if (built.some((js) => js.includes("jsxDEV")))
    throw new Error("build: JSX compiled for React's development runtime");
  for (const entry of entries)
    await cp(
      join(temp, `rollup/${entry}.d.ts`),
      join(dist, entry === "index" ? "index.d.ts" : `${entry}/index.d.ts`),
    );
  if (styles.length)
    await Bun.write(
      join(dist, "styles.css"),
      (await Promise.all(styles.map((path) => Bun.file(join(root, path)).text()))).join("\n"),
    );

  // Size, gzipped: `.` with any chunk, then what `./react` adds on top.
  const gz = (js: string) => Bun.gzipSync(js).length;
  const reactJs = text("react/index.js");
  const index = built
    .filter((js, i) => result.outputs[i]!.path.endsWith(".js") && js !== reactJs)
    .reduce((sum, js) => sum + gz(js), 0);
  const sizes = { index, react: entries.includes("react") ? index + gz(reactJs) : undefined };
  console.log(
    `size: . ${(index / 1000).toFixed(1)} KB` +
      (sizes.react ? `, . + ./react ${(sizes.react / 1000).toFixed(1)} KB` : "") +
      " gzipped",
  );
  for (const entry of entries)
    if ((sizes[entry] ?? 0) > (budget[entry] ?? Infinity))
      throw new Error(`build: ${entry} is over its size budget of ${budget[entry]} bytes gzipped`);

  await rm(temp, { recursive: true, force: true });
  console.log(`build: ${name}@${manifest.version} in dist/`);
}
