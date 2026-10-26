import { Glob } from "bun";
import { describe, expect, test } from "bun:test";

/**
 * The core's boundary, enforced rather than promised: it knows nothing about what is being
 * collected, how it is drawn, or which view is drawing it. Derived from the tree, so a file added
 * later is covered without updating a list.
 */
const ROOT = `${import.meta.dir}/..`;
const SELF = "src/architecture.test.ts";

/** Consumer vocabulary. Words, not substrings: "holding" would also match "upholding". */
const FORBIDDEN_WORDS =
  /\b(lego|studopus|rebrickable|picabase|bricks?|minifig\w*|holdings?|clerk|posthog)\b/i;

async function sources(): Promise<string[]> {
  const found: string[] = [];
  for await (const file of new Glob("src/**/*.{ts,tsx}").scan({ cwd: ROOT, onlyFiles: true }))
    if (file !== SELF) found.push(file);
  return found.sort();
}

describe("core boundary", () => {
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

  test("imports only its own modules: no React, no view, nothing outside the package", async () => {
    const offenders: string[] = [];
    for (const file of await sources()) {
      const text = await Bun.file(`${ROOT}/${file}`).text();
      for (const [, specifier] of text.matchAll(/from\s+["']([^"']+)["']/g))
        if (!specifier!.startsWith("./") && !specifier!.startsWith("bun"))
          offenders.push(`${file}: ${specifier}`);
    }
    expect(offenders).toEqual([]);
  });

  test("has no dependencies of any kind", async () => {
    const manifest = await Bun.file(`${ROOT}/package.json`).json();
    expect(manifest.dependencies ?? {}).toEqual({});
    expect(manifest.peerDependencies ?? {}).toEqual({});
  });
});
