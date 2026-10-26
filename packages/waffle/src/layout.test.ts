import { encodeProfile, UNKNOWN_CATEGORY_ID } from "@data-profile/core";
import { describe, expect, test } from "bun:test";
import { libraryDimensions, libraryItems } from "./fixtures";
import { layoutWaffle } from "./layout";

const [genre, decade] = libraryDimensions;
const items = libraryItems(400);

/** Deterministic shuffle, so the order-independence test is itself reproducible. */
const shuffled = <T>(values: readonly T[]) =>
  values
    .map((value, i) => ({ value, key: Math.sin(i * 12.9898) * 43758.5453 }))
    .sort((a, b) => (a.key % 1) - (b.key % 1))
    .map(({ value }) => value);

describe("layoutWaffle", () => {
  test("its cells are core's marks, in order, with a place in the grid added", () => {
    const layout = layoutWaffle({ items, dimensions: libraryDimensions });
    const { marks, ...profile } = encodeProfile({
      items,
      dimensions: libraryDimensions,
      maxMarks: 1000,
    });
    expect(layout).toMatchObject(profile);
    expect(layout.cells.map(({ x, y, size, rotation, column, row, ...mark }) => mark)).toEqual(
      marks,
    );
    expect(layout.cells.every((cell) => cell.rotation === 0)).toBe(true);
  });

  test("fills a square grid left to right, then top to bottom, inside the frame", () => {
    const layout = layoutWaffle({ items, dimensions: [genre!] });
    expect([layout.columns, layout.rows]).toEqual([20, 20]);
    expect(layout.height).toBeCloseTo(layout.width);
    layout.cells.forEach((cell, i) => {
      expect([cell.column, cell.row]).toEqual([i % 20, Math.floor(i / 20)]);
      expect(cell.x).toBeCloseTo((cell.column + 0.5) * layout.pitch);
      expect(cell.y).toBeCloseTo((cell.row + 0.5) * layout.pitch);
      expect(cell.x + cell.size / 2).toBeLessThanOrEqual(layout.width);
      expect(cell.y + cell.size / 2).toBeLessThanOrEqual(layout.height);
    });
  });

  test("each category is a run in reading order, unknown last", () => {
    const layout = layoutWaffle({ items, dimensions: [genre!] });
    const order = [...genre!.categories.map((c) => c.id), UNKNOWN_CATEGORY_ID];
    const ranks = layout.cells.map((cell) => order.indexOf(cell.categories.genre!));
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
  });

  test("columns can be set: ten across for one cell per percent", () => {
    const hundred = libraryItems(100);
    const layout = layoutWaffle({ items: hundred, dimensions: [genre!], columns: 10 });
    expect([layout.columns, layout.rows, layout.pitch]).toEqual([10, 10, 40]);
    const ragged = layoutWaffle({ items: libraryItems(23), dimensions: [genre!], columns: 10 });
    expect([ragged.rows, ragged.height]).toEqual([3, 120]);
  });

  test("cell area is proportional to weight, and the gap shrinks every cell alike", () => {
    const weighted = [
      { id: "one", weight: 1, values: { genre: "art" } },
      { id: "four", weight: 4, values: { genre: "art" } },
    ];
    const layout = layoutWaffle({ items: weighted, dimensions: [genre!], columns: 2 });
    const size = (id: string) => layout.cells.find((cell) => cell.id === id)!.size;
    expect((size("four") / size("one")) ** 2).toBeCloseTo(4);
    expect(size("four")).toBeCloseTo(layout.pitch * 0.85);
    const tight = layoutWaffle({ items: weighted, dimensions: [genre!], columns: 2, gap: 0 });
    expect(tight.cells.find((cell) => cell.id === "four")!.size).toBeCloseTo(tight.pitch);
  });

  test("is identical whatever order the items arrive in", () => {
    const a = layoutWaffle({ items, dimensions: [decade!] });
    expect(layoutWaffle({ items: shuffled(items), dimensions: [decade!] })).toEqual(a);
  });

  test("caps at 1,000 cells by default, never dropping an item", () => {
    const many = libraryItems(5000);
    const layout = layoutWaffle({ items: many, dimensions: libraryDimensions });
    expect(layout.itemsPerMark).toBe(5);
    expect(layout.cells.length).toBeLessThan(1100);
    expect(layout.cells.reduce((sum, cell) => sum + cell.itemIds.length, 0)).toBe(5000);
    for (const maxMarks of [undefined, Number.NaN, 0])
      expect(layoutWaffle({ items: many, dimensions: [genre!], maxMarks }).itemsPerMark).toBe(5);
  });

  test("an empty dataset is an empty grid one row high", () => {
    const layout = layoutWaffle({ items: [], dimensions: [genre!] });
    expect(layout.cells).toEqual([]);
    expect([layout.columns, layout.rows]).toEqual([1, 0]);
    expect(layout.height).toBeGreaterThan(0);
  });
});
