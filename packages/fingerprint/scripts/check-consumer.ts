/**
 * Installs the packed package into a fresh npm project, as a consumer would, and proves it works
 * there: type-checked under `bundler` and `node16` resolution, then run under plain Node (a server
 * render of the canvas and a legend). The React version is an argument, so CI runs it as a matrix.
 *
 *   bun run build && bun run scripts/check-consumer.ts [react-version]
 *   e.g. bun run scripts/check-consumer.ts 18
 */
import { $ } from "bun";
import { cp, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const [react = "19"] = process.argv.slice(2);
const root = join(import.meta.dir, "..");
if (!(await Bun.file(join(root, "dist/index.js")).exists())) {
  console.error("check-consumer: no dist/; run `bun run build` first");
  process.exit(1);
}

const app = await mkdtemp(join(tmpdir(), "fingerprint-consumer-"));
try {
  const packed = await $`npm pack --pack-destination ${app} --silent`.cwd(root).text();
  const tarball = packed.trim().split("\n").pop()!;
  await Bun.write(
    join(app, "package.json"),
    JSON.stringify({ name: "consumer", private: true, type: "module" }),
  );
  await $`npm install --silent --no-audit --no-fund ${join(app, tarball)} react@${react} react-dom@${react} @types/react@${react} @types/react-dom@${react} typescript@5`.cwd(
    app,
  );
  await cp(join(import.meta.dir, "consumer/consumer.ts"), join(app, "consumer.ts"));

  const common = { target: "ES2022", strict: true, skipLibCheck: false, lib: ["ES2022", "DOM"] };
  for (const resolution of ["bundler", "node16"]) {
    const module = resolution === "bundler" ? "ESNext" : "Node16";
    await Bun.write(
      join(app, `tsconfig.${resolution}.json`),
      JSON.stringify({
        compilerOptions: {
          ...common,
          module,
          moduleResolution: resolution,
          outDir: `out-${resolution}`,
        },
        files: ["consumer.ts"],
      }),
    );
    // `skipLibCheck: false`, so this package's own declarations are checked too.
    const output = await $`npx tsc -p tsconfig.${resolution}.json`.cwd(app).nothrow().text();
    if (output.trim()) {
      console.error(`check-consumer: type errors under ${resolution} resolution:\n${output}`);
      process.exit(1);
    }
  }
  const version = await $`node -p "require('./node_modules/react/package.json').version"`
    .cwd(app)
    .text();
  await $`node out-node16/consumer.js`.cwd(app);
  console.log(`check-consumer: passed with react@${version.trim()}`);
} finally {
  await rm(app, { recursive: true, force: true });
}
