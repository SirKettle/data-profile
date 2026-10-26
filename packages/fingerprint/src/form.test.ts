import { describe, expect, test } from "bun:test";
import { libraryDimensions, libraryItems } from "./fixtures";
import { formFromItems, formFromSeed } from "./form";
import { ridgeOpacity } from "./opacity";
import type { FingerprintItem } from "./types";

describe("formFromItems", () => {
  test("is a function of the data: same collection, same shape, whatever the order", () => {
    const items = libraryItems(300);
    expect(formFromItems([...items].reverse(), libraryDimensions)).toEqual(
      formFromItems(items, libraryDimensions),
    );
  });

  test("holds still as a collection grows by an item", () => {
    const items = libraryItems(301);
    expect(formFromItems(items, libraryDimensions)).toEqual(
      formFromItems(items.slice(0, 300), libraryDimensions),
    );
  });

  test("a young collection is an arch; a focused one a loop; a broad one a whorl", () => {
    const [genre] = libraryDimensions;
    const make = (genres: string[]): FingerprintItem[] =>
      genres.map((g, i) => ({ id: `i${i}`, values: { [genre!.id]: g } }));
    expect(formFromItems(make(["art", "poetry"]), libraryDimensions).pattern).toBe("arch");
    const focused = make([...Array(20).fill("poetry"), ...Array(10).fill("art")]);
    expect(formFromItems(focused, libraryDimensions).pattern).toBe("loop");
    const broad = make(genre!.categories.flatMap((c) => Array(5).fill(c.id)));
    expect(formFromItems(broad, libraryDimensions).pattern).toBe("whorl");
  });

  test("the core leans towards where the second dimension's values sit", () => {
    const decade = libraryDimensions[1]!;
    const make = (d: string) =>
      Array.from({ length: 30 }, (_, i) => ({ id: `i${i}`, values: { [decade.id]: d } }));
    const early = formFromItems(make("1950"), libraryDimensions);
    const late = formFromItems(make("2020"), libraryDimensions);
    expect(early.coreX).toBeLessThan(0);
    expect(late.coreX).toBeGreaterThan(0);
    expect(early.hand).toBe(-1);
    expect(late.hand).toBe(1);
  });

  test("every field stays in range", () => {
    for (const seed of ["a", "b", "c", "d", "e"]) {
      const shape = formFromSeed(seed);
      expect(Math.abs(shape.coreX)).toBeLessThanOrEqual(1);
      expect(Math.abs(shape.coreY)).toBeLessThanOrEqual(1);
      expect(shape.spread).toBeGreaterThanOrEqual(0);
      expect(shape.spread).toBeLessThanOrEqual(1);
      expect(Math.abs(shape.tilt)).toBeLessThanOrEqual(10);
    }
  });
});

describe("ridgeOpacity", () => {
  test("auto shows ridges for small collections and fades them out as it fills", () => {
    expect(ridgeOpacity(10)).toBe(0.22);
    expect(ridgeOpacity(60)).toBe(0.22);
    expect(ridgeOpacity(110)).toBeCloseTo(0.11);
    expect(ridgeOpacity(160)).toBe(0);
    expect(ridgeOpacity(1000)).toBe(0);
  });

  test("always, never and custom thresholds", () => {
    expect(ridgeOpacity(1000, { show: "always", opacity: 0.4 })).toBe(0.4);
    expect(ridgeOpacity(5, { show: "never" })).toBe(0);
    expect(ridgeOpacity(150, { fadeFrom: 200, fadeTo: 400 })).toBe(0.22);
  });
});
