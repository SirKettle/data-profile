import { describe, expect, test } from "bun:test";
import * as react from "./index";

/**
 * The package's public runtime surface. A change here is a change to the published contract: it
 * should be deliberate, and recorded in the changelog.
 */
describe("public surface", () => {
  test("exports exactly these values", () => {
    expect(Object.keys(react).sort()).toEqual([
      "CategoryList",
      "Legend",
      "MarkCanvas",
      "ViewSwitch",
      "dotsRenderer",
      "shapesRenderer",
      "useViews",
    ]);
  });

  test("package.json exposes the entry, the stylesheet and itself, and nothing else", async () => {
    const manifest = await Bun.file(`${import.meta.dir}/../package.json`).json();
    expect(Object.keys(manifest.exports)).toEqual([".", "./styles.css", "./package.json"]);
  });
});
