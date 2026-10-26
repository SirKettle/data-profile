import { describe, expect, test } from "bun:test";
import * as waffle from "./index";

/**
 * The package's public runtime surface. A change here is a change to the published contract: it
 * should be deliberate, and recorded in the changelog.
 */
describe("public surface", () => {
  test("exports exactly these values", () => {
    expect(Object.keys(waffle).sort()).toEqual(["layoutWaffle"]);
  });

  test("package.json exposes the entry and itself, and nothing else", async () => {
    const manifest = await Bun.file(`${import.meta.dir}/../package.json`).json();
    expect(Object.keys(manifest.exports)).toEqual([".", "./package.json"]);
  });
});
