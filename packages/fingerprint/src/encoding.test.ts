import { encodeProfile } from "@data-profile/core";
import { describe, expect, test } from "bun:test";
import { libraryDimensions, libraryItems } from "./fixtures";
import { layoutFingerprint } from "./layout";
import type { FingerprintEncoding } from "./types";

/**
 * How encoding is worked out is `@data-profile/core`'s, and tested there. What is the fingerprint's
 * own: that a layout places exactly core's marks, the ridges a view change keeps, and its default cap.
 */
const combined: FingerprintEncoding = {
  arrange: "genre",
  color: "genre",
  shape: "state",
  lightness: "decade",
};
const items = libraryItems(400);

describe("the layout places core's profile", () => {
  test("its nodes are core's marks, in order, with a position and a size added", () => {
    const layout = layoutFingerprint({ items, dimensions: libraryDimensions, encoding: combined });
    const { marks, ...profile } = encodeProfile({
      items,
      dimensions: libraryDimensions,
      encoding: combined,
      maxMarks: 600,
    });
    expect(layout).toMatchObject(profile);
    expect(layout.nodes.map(({ x, y, rotation, size, ...mark }) => mark)).toEqual(marks);
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
