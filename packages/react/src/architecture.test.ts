import { Glob } from "bun";
import { describe, expect, test } from "bun:test";

/**
 * The shared React package's boundary, enforced rather than promised: it knows nothing about what
 * is being collected or which view is drawing, and builds on `@data-profile/core` and React alone.
 * Derived from the tree, so a file added later is covered without updating a list.
 */
const ROOT = `${import.meta.dir}/..`;
const SELF = "src/architecture.test.ts";

/** Consumer vocabulary. Words, not substrings: "holding" would also match "upholding". */
const FORBIDDEN_WORDS =
  /\b(lego|studopus|rebrickable|picabase|bricks?|minifig\w*|holdings?|clerk|posthog)\b/i;
/** No view's name: what a view needs from this package must make sense for every view. */
const VIEW_WORDS = /\b(fingerprint|ridges?|waffle)\b/i;

async function sources(): Promise<string[]> {
  const found: string[] = [];
  for await (const file of new Glob("src/**/*.{ts,tsx}").scan({ cwd: ROOT, onlyFiles: true }))
    if (file !== SELF) found.push(file);
  return found.sort();
}

describe("react boundary", () => {
  test("no consumer vocabulary, and no view's name, in any source file", async () => {
    const offenders: string[] = [];
    for (const file of await sources()) {
      const text = await Bun.file(`${ROOT}/${file}`).text();
      text.split("\n").forEach((line, i) => {
        if (FORBIDDEN_WORDS.test(line) || VIEW_WORDS.test(line))
          offenders.push(`${file}:${i + 1}: ${line.trim()}`);
      });
    }
    expect(offenders).toEqual([]);
  });

  test("imports only its own modules, @data-profile/core and React", async () => {
    const offenders: string[] = [];
    const allowed =
      /^(\.\/|bun|react$|react\/|@data-profile\/core$|@testing-library\/|@happy-dom\/)/;
    for (const file of await sources()) {
      const text = await Bun.file(`${ROOT}/${file}`).text();
      for (const [, specifier] of text.matchAll(/from\s+["']([^"']+)["']/g))
        if (!allowed.test(specifier!)) offenders.push(`${file}: ${specifier}`);
    }
    expect(offenders).toEqual([]);
  });

  test("depends on @data-profile/core, with React as its only peer", async () => {
    const manifest = await Bun.file(`${ROOT}/package.json`).json();
    expect(Object.keys(manifest.dependencies ?? {})).toEqual(["@data-profile/core"]);
    expect(Object.keys(manifest.peerDependencies ?? {})).toEqual(["react"]);
  });

  test("the stylesheet uses colour only as a fallback inside a --dp- custom property", async () => {
    const css = (await Bun.file(`${ROOT}/styles.css`).text()).replace(/\/\*[\s\S]*?\*\//g, "");
    const literals = css.match(/#[0-9a-fA-F]{3,8}\b/g) ?? [];
    expect(literals.length).toBeGreaterThan(0);
    for (const literal of literals)
      expect(css).toMatch(new RegExp(`var\\(--dp-[a-z-]+, ${literal}\\)`));
    expect(css).not.toMatch(/fp-/);
  });
});
