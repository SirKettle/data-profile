/**
 * Installs the packed package, with the packed `@data-profile/core` it depends on, into a fresh npm
 * project, as a consumer would, and proves it works there: type-checked under `bundler` and
 * `node16` resolution, then run under plain Node.
 *
 *   bun run build (at the root) && bun run scripts/check-consumer.ts
 */
import { $ } from "bun";
import { cp, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const root = join(import.meta.dir, "..");
if (
  !(await Bun.file(join(root, "dist/index.js")).exists()) ||
  !(await Bun.file(join(root, "../core/dist/index.js")).exists())
) {
  console.error(
    "check-consumer: no dist/ here or in ../core; run `bun run build` at the root first",
  );
  process.exit(1);
}

const app = await mkdtemp(join(tmpdir(), "waffle-consumer-"));
try {
  // Core is packed from the workspace too: the check is of the two as they would be published.
  const pack = async (dir: string) =>
    join(
      app,
      (await $`npm pack --pack-destination ${app} --silent`.cwd(dir).text())
        .trim()
        .split("\n")
        .pop()!,
    );
  const tarballs = [await pack(join(root, "../core")), await pack(root)];
  await Bun.write(
    join(app, "package.json"),
    JSON.stringify({ name: "consumer", private: true, type: "module" }),
  );
  await $`npm install --silent --no-audit --no-fund ${tarballs} typescript@5`.cwd(app);
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
    // `skipLibCheck: false`, so the packages' own declarations are checked too.
    const output = await $`npx tsc -p tsconfig.${resolution}.json`.cwd(app).nothrow().text();
    if (output.trim()) {
      console.error(`check-consumer: type errors under ${resolution} resolution:\n${output}`);
      process.exit(1);
    }
  }
  await $`node out-node16/consumer.js`.cwd(app);
  console.log("check-consumer: passed");
} finally {
  await rm(app, { recursive: true, force: true });
}
