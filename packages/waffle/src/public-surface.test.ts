import { describe, expect, test } from "bun:test";
import * as waffle from "./index";
import * as react from "./react/index";

/**
 * The package's public runtime surface. A change here is a change to the published contract: it
 * should be deliberate, and recorded in the changelog.
 */
describe("public surface", () => {
  test("the layout exports exactly these values", () => {
    expect(Object.keys(waffle).sort()).toEqual(["layoutWaffle"]);
  });

  test("./react exports exactly these values", () => {
    expect(Object.keys(react).sort()).toEqual([
      "CategoryList",
      "Legend",
      "ViewSwitch",
      "WaffleCanvas",
      "dotsRenderer",
      "shapesRenderer",
      "useWaffle",
    ]);
  });

  test("package.json exposes the layout, ./react, ./styles.css and itself, and nothing else", async () => {
    const manifest = await Bun.file(`${import.meta.dir}/../package.json`).json();
    expect(Object.keys(manifest.exports)).toEqual([
      ".",
      "./react",
      "./styles.css",
      "./package.json",
    ]);
  });
});
