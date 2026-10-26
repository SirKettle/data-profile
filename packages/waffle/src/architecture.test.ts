import { Glob } from "bun";
import { describe, expect, test } from "bun:test";

/**
 * The waffle's boundary, enforced rather than promised: it knows nothing about what is being
 * collected, and builds on `@data-profile/core` alone, never on another view. Derived from the
 * tree, so a file added later is covered without updating a list.
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

describe("waffle boundary", () => {
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

  test("the layout imports only its own modules and @data-profile/core", async () => {
    const offenders: string[] = [];
    for (const file of await sources()) {
      if (file.startsWith("src/react/")) continue;
      const text = await Bun.file(`${ROOT}/${file}`).text();
      for (const [, specifier] of text.matchAll(/from\s+["']([^"']+)["']/g))
        if (!/^(\.\/|bun|@data-profile\/core$)/.test(specifier!))
          offenders.push(`${file}: ${specifier}`);
    }
    expect(offenders).toEqual([]);
  });

  test("src/react adds only React and @data-profile/react, never another view", async () => {
    const offenders: string[] = [];
    const allowed =
      /^(\.\.?\/|bun|react$|react\/|@data-profile\/(core|react)$|@testing-library\/|@happy-dom\/)/;
    for (const file of await sources()) {
      if (!file.startsWith("src/react/")) continue;
      const text = await Bun.file(`${ROOT}/${file}`).text();
      for (const [, specifier] of text.matchAll(/from\s+["']([^"']+)["']/g))
        if (!allowed.test(specifier!)) offenders.push(`${file}: ${specifier}`);
    }
    expect(offenders).toEqual([]);
  });

  test("depends on core and the shared React package, with React an optional peer", async () => {
    const manifest = await Bun.file(`${ROOT}/package.json`).json();
    expect(Object.keys(manifest.dependencies ?? {})).toEqual([
      "@data-profile/core",
      "@data-profile/react",
    ]);
    expect(Object.keys(manifest.peerDependencies ?? {})).toEqual(["react"]);
    expect(manifest.peerDependenciesMeta?.react?.optional).toBe(true);
  });
});
