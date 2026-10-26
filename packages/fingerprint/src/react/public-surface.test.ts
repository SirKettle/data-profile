import { describe, expect, test } from "bun:test";
import * as core from "../index";
import * as react from "./index";

/**
 * The package's public runtime surface, as approved in the API review before 0.1.0. A change here is a
 * change to the published contract: it should be deliberate, and recorded in the changelog.
 */
describe("public surface", () => {
  test("the core exports exactly these values", () => {
    expect(Object.keys(core).sort()).toEqual([
      "DEFAULT_PALETTE",
      "FingerprintDataError",
      "UNKNOWN_CATEGORY_ID",
      "UNKNOWN_COLOR",
      "describeLayout",
      "formFromItems",
      "layoutFingerprint",
      "markOpacity",
      "placeCallouts",
    ]);
  });

  test("./react exports exactly these values", () => {
    expect(Object.keys(react).sort()).toEqual([
      "FingerprintCanvas",
      "FingerprintLegend",
      "FingerprintList",
      "FingerprintViewSwitch",
      "dotsRenderer",
      "markOpacity",
      "shapesRenderer",
      "useFingerprint",
    ]);
  });

  test("package.json exposes the core, ./react, ./styles.css and itself, and nothing else", async () => {
    const manifest = await Bun.file(`${import.meta.dir}/../../package.json`).json();
    expect(Object.keys(manifest.exports)).toEqual([
      ".",
      "./react",
      "./styles.css",
      "./package.json",
    ]);
  });

  test("the optional stylesheet uses colour only as a fallback inside a custom property", async () => {
    const css = (await Bun.file(`${import.meta.dir}/../../styles.css`).text()).replace(
      /\/\*[\s\S]*?\*\//g,
      "",
    );
    const literals = css.match(/#[0-9a-fA-F]{3,8}\b/g) ?? [];
    expect(literals.length).toBeGreaterThan(0);
    for (const literal of literals)
      expect(css).toMatch(new RegExp(`var\\(--fp-[a-z-]+, ${literal}\\)`));
  });
});
