import { describe, expect, test } from "bun:test";
import { libraryDimensions, libraryItems } from "./fixtures";
import { FingerprintDataError, layoutFingerprint, UNKNOWN_CATEGORY_ID } from "./layout";
import type { FingerprintDimension, FingerprintEncoding } from "./types";

const combined: FingerprintEncoding = {
  arrange: "genre",
  color: "genre",
  shape: "state",
  lightness: "decade",
};
const items = libraryItems(400);
const decade = libraryDimensions.find((d) => d.id === "decade")!;
const state = libraryDimensions.find((d) => d.id === "state")!;

describe("encoding several dimensions at once", () => {
  test("left out, the first dimension arranges, colours and shapes, and lightness is off", () => {
    const layout = layoutFingerprint({ items, dimensions: libraryDimensions });
    expect(layout.encoding).toEqual({
      arrange: "genre",
      color: "genre",
      shape: "genre",
      lightness: null,
    });
    expect(layout.legends.map((g) => [g.dimensionId, g.channels])).toEqual([
      ["genre", ["color", "shape", "arrange"]],
    ]);
    expect(layout.nodes.every((node) => node.lightness === null)).toBe(true);
  });

  test("each mark takes its colour, shape and lightness from its own item's categories", () => {
    const layout = layoutFingerprint({ items, dimensions: libraryDimensions, encoding: combined });
    const byId = new Map(items.map((item) => [item.id, item]));
    const colour = new Map(layout.legends[0]!.entries.map((e) => [e.id, e.color]));
    for (const node of layout.nodes) {
      const item = byId.get(node.id)!;
      expect(node.color).toBe(colour.get(item.values.genre ?? UNKNOWN_CATEGORY_ID)!);
      const s = item.values.state;
      expect(node.shape).toBe(s == null ? null : state.categories.findIndex((c) => c.id === s));
      const d = item.values.decade;
      expect(node.lightness).toBe(
        d == null
          ? null
          : decade.categories.findIndex((c) => c.id === d) / (decade.categories.length - 1),
      );
      expect(node.categories).toEqual({
        genre: item.values.genre ?? UNKNOWN_CATEGORY_ID,
        state: item.values.state ?? UNKNOWN_CATEGORY_ID,
        decade: item.values.decade ?? UNKNOWN_CATEGORY_ID,
      });
    }
  });

  test("one legend per dimension, colour first, each counting every item", () => {
    const layout = layoutFingerprint({ items, dimensions: libraryDimensions, encoding: combined });
    expect(layout.legends.map((g) => [g.dimensionId, g.channels])).toEqual([
      ["genre", ["color", "arrange"]],
      ["state", ["shape"]],
      ["decade", ["lightness"]],
    ]);
    for (const group of layout.legends)
      expect(group.entries.reduce((sum, e) => sum + e.count, 0)).toBe(items.length);
    // Legend swatches carry only the property their dimension drives.
    expect(
      layout.legends[1]!.entries.every((e) => e.color === "currentColor" && e.lightness === null),
    ).toBe(true);
    expect(
      layout.legends[2]!.entries.every((e) => e.color === "currentColor" && e.shape === 0),
    ).toBe(true);
  });

  test("a property can be turned off", () => {
    const layout = layoutFingerprint({
      items,
      dimensions: libraryDimensions,
      encoding: {
        arrange: "genre",
        color: null,
        shape: null,
      },
    });
    expect(layout.nodes.every((node) => node.color === "currentColor" && node.shape === 0)).toBe(
      true,
    );
  });

  test("runs: arranged by genre, then split by state, then decade, inside each genre", () => {
    const layout = layoutFingerprint({ items, dimensions: libraryDimensions, encoding: combined });
    const genreRank = (id: string) =>
      libraryDimensions[0]!.categories.findIndex((c) => c.id === id);
    const ranks = layout.nodes.map((node) =>
      node.categories.genre === UNKNOWN_CATEGORY_ID ? 99 : genreRank(node.categories.genre!),
    );
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
  });

  test("above the cap, a mark only joins items that agree on every encoded dimension", () => {
    const many = libraryItems(3200);
    const layout = layoutFingerprint({
      items: many,
      dimensions: libraryDimensions,
      encoding: combined,
      maxMarks: 1500,
    });
    expect(layout.itemsPerMark).toBe(3);
    const byId = new Map(many.map((item) => [item.id, item]));
    for (const node of layout.nodes) {
      const values = node.itemIds.map((id) => byId.get(id)!.values);
      for (const key of ["genre", "state", "decade"])
        expect(new Set(values.map((v) => v[key] ?? null)).size).toBe(1);
    }
    expect(layout.nodes.flatMap((node) => node.itemIds)).toHaveLength(many.length);
  });

  test("lightness needs an ordered dimension, and every encoded id must exist", () => {
    expect(() =>
      layoutFingerprint({
        items,
        dimensions: libraryDimensions,
        encoding: { arrange: "genre", lightness: "genre" },
      }),
    ).toThrow(FingerprintDataError);
    expect(() =>
      layoutFingerprint({ items, dimensions: libraryDimensions, encoding: { arrange: "nope" } }),
    ).toThrow(FingerprintDataError);
    expect(() => layoutFingerprint({ items, dimensions: [] })).toThrow(FingerprintDataError);
  });

  test("warns when a property shows more categories than it can keep apart", () => {
    const many: FingerprintDimension = {
      id: "n",
      label: "Number",
      categories: Array.from({ length: 12 }, (_, i) => ({ id: `c${i}`, label: `C${i}` })),
    };
    const twelve = Array.from({ length: 12 }, (_, i) => ({ id: `i${i}`, values: { n: `c${i}` } }));
    const layout = layoutFingerprint({ items: twelve, dimensions: [many] });
    expect(layout.warnings).toEqual([
      'Colour shows 12 categories of "Number"; beyond 10 they repeat, so only the legend tells them apart.',
      'Shape shows 12 categories of "Number"; beyond 5 they repeat, so only the legend tells them apart.',
    ]);
    expect(
      layoutFingerprint({ items, dimensions: libraryDimensions, encoding: combined }).warnings,
    ).toEqual([]);
  });

  test("changing view moves marks but never the ridges", () => {
    const a = layoutFingerprint({ items, dimensions: libraryDimensions, encoding: combined });
    const b = layoutFingerprint({
      items,
      dimensions: libraryDimensions,
      encoding: { arrange: "decade" },
    });
    expect(b.ridges).toBe(a.ridges);
  });
});

describe("the mark cap holds for very large collections", () => {
  test("an explicit undefined, NaN or zero option falls back to the default cap", () => {
    const many = libraryItems(30000);
    for (const maxMarks of [undefined, Number.NaN, 0, -5]) {
      const layout = layoutFingerprint({
        items: many,
        dimensions: libraryDimensions,
        encoding: combined,
        maxMarks,
        minRidges: undefined,
        seed: undefined,
      });
      expect(layout.itemsPerMark).toBe(50);
      expect(layout.nodes.length).toBeLessThan(700);
      expect(layout.nodes.reduce((sum, node) => sum + node.itemIds.length, 0)).toBe(30000);
    }
  });

  test("100,000 items lay out as about 600 marks by default", () => {
    const layout = layoutFingerprint({
      items: libraryItems(100000),
      dimensions: libraryDimensions,
      encoding: combined,
    });
    expect(layout.itemsPerMark).toBe(167);
    expect(layout.nodes.length).toBeLessThan(700);
  });
});
