import { Glob } from "bun";
import { describe, expect, test } from "bun:test";

/**
 * The package's boundary, enforced rather than promised: it knows nothing about what is being
 * collected or who is consuming it. It was extracted from an app whose vocabulary is listed below;
 * a boundary kept only by review drifts. Derived from the tree, so a file added later is covered
 * without updating a list.
 */
const ROOT = `${import.meta.dir}/..`;
const SELF = "src/architecture.test.ts";

/** Consumer vocabulary. Words, not substrings: "holding" would also match "upholding". */
const FORBIDDEN_WORDS =
  /\b(lego|studopus|rebrickable|picabase|bricks?|minifig\w*|holdings?|clerk|posthog)\b/i;
const FORBIDDEN_IMPORTS = [
  /from\s+["']@picabase\//,
  /from\s+["'](\.\.\/)+(apps|packages)\//,
  /from\s+["']\.\.\/\.\.\//,
];

async function sources(): Promise<string[]> {
  const found: string[] = [];
  for await (const file of new Glob("src/**/*.{ts,tsx}").scan({ cwd: ROOT, onlyFiles: true }))
    if (file !== SELF) found.push(file);
  return found.sort();
}

describe("package boundary", () => {
  test("no consumer vocabulary in any source file", async () => {
    const offenders: string[] = [];
    for (const file of await sources()) {
      const text = await Bun.file(`${ROOT}/${file}`).text();
      text.split("\n").forEach((line, i) => {
        if (FORBIDDEN_WORDS.test(line)) offenders.push(`${file}:${i + 1}: ${line.trim()}`);
      });
    }
    expect(offenders).toEqual([]);
  });

  test("imports nothing from the workspace around it", async () => {
    const offenders: string[] = [];
    for (const file of await sources()) {
      const text = await Bun.file(`${ROOT}/${file}`).text();
      if (FORBIDDEN_IMPORTS.some((pattern) => pattern.test(text))) offenders.push(file);
    }
    expect(offenders).toEqual([]);
  });

  test("the core never imports React: only src/react may, so the layout works without it", async () => {
    const offenders: string[] = [];
    for (const file of await sources()) {
      if (file.startsWith("src/react/")) continue;
      const text = await Bun.file(`${ROOT}/${file}`).text();
      if (/from\s+["'](react|react-dom)(\/[^"']*)?["']|from\s+["']\.\/react\//.test(text))
        offenders.push(file);
    }
    expect(offenders).toEqual([]);
  });

  test("has no runtime dependencies", async () => {
    const manifest = await Bun.file(`${ROOT}/package.json`).json();
    expect(manifest.dependencies ?? {}).toEqual({});
    expect(Object.keys(manifest.peerDependencies ?? {})).toEqual(["react"]);
  });
});
