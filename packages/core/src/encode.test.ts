import { describe, expect, test } from "bun:test";
import { DataError, encodeProfile, UNKNOWN_CATEGORY_ID } from "./encode";
import { libraryDimensions, libraryItems } from "./fixtures";
import type { Dimension, Encoding, Item } from "./types";

const [genre, decade, state] = libraryDimensions as [Dimension, Dimension, Dimension];
const combined: Encoding = {
  arrange: "genre",
  color: "genre",
  shape: "state",
  lightness: "decade",
};
const items = libraryItems(400);

/** Deterministic shuffle, so the order-independence test is itself reproducible. */
const shuffled = <T>(values: readonly T[]) =>
  values
    .map((value, i) => ({ value, key: Math.sin(i * 12.9898) * 43758.5453 }))
    .sort((a, b) => (a.key % 1) - (b.key % 1))
    .map(({ value }) => value);

describe("encodeProfile", () => {
  test("one mark per item, in the same order whatever order the items arrive in", () => {
    const a = encodeProfile({ items, dimensions: [decade] });
    expect(a.marks).toHaveLength(items.length);
    expect(a.itemsPerMark).toBe(1);
    expect(encodeProfile({ items: shuffled(items), dimensions: [decade] })).toEqual(a);
  });

  test("every mark keeps its item's identity across views", () => {
    const ids = (dimension: Dimension) =>
      encodeProfile({ items, dimensions: [dimension] })
        .marks.map((mark) => mark.id)
        .sort();
    expect(ids(decade)).toEqual(ids(genre));
    expect(ids(state)).toEqual(ids(genre));
  });

  test("every view accounts for every item, unknowns included", () => {
    for (const dimension of libraryDimensions) {
      const profile = encodeProfile({ items, dimensions: [dimension] });
      expect(profile.legends[0]!.entries.reduce((sum, entry) => sum + entry.count, 0)).toBe(
        items.length,
      );
      expect(profile.itemCount).toBe(items.length);
    }
  });

  test("marks run in category order, unknown last", () => {
    const profile = encodeProfile({ items, dimensions: [genre] });
    const order = [...genre.categories.map((c) => c.id), UNKNOWN_CATEGORY_ID];
    const ranks = profile.marks.map((mark) => order.indexOf(mark.categories.genre!));
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
    expect(profile.legends[0]!.entries.at(-1)).toMatchObject({
      id: UNKNOWN_CATEGORY_ID,
      label: "Uncatalogued",
      unknown: true,
    });
  });

  test("null, missing and unlisted values are unknown, and kept", () => {
    const odd: Item[] = [
      { id: "a", values: { genre: null } },
      { id: "b", values: {} },
      { id: "c", values: { genre: "not-a-genre" } },
      { id: "d", values: { genre: "poetry" } },
    ];
    const profile = encodeProfile({ items: odd, dimensions: [genre] });
    expect(profile.marks).toHaveLength(4);
    expect(
      profile.marks
        .filter((mark) => mark.categories.genre === UNKNOWN_CATEGORY_ID)
        .map((mark) => mark.id),
    ).toEqual(["a", "b", "c"]);
  });

  test("the unknown category is listed only when it has items", () => {
    const known = [{ id: "a", values: { state: "read" } }];
    expect(
      encodeProfile({ items: known, dimensions: [state] }).legends[0]!.entries.map(
        (entry) => entry.id,
      ),
    ).toEqual(["read", "reading", "unread"]);
  });

  test("a mark's weight is its items' summed weight", () => {
    const profile = encodeProfile({
      items: [
        { id: "one", weight: 1, values: { genre: "art" } },
        { id: "four", weight: 4, values: { genre: "art" } },
        { id: "plain", values: { genre: "art" } },
      ],
      dimensions: [genre],
    });
    expect(profile.marks.map((mark) => [mark.id, mark.weight])).toEqual([
      ["four", 4],
      ["one", 1],
      ["plain", 1],
    ]);
    expect(profile.legends[0]!.entries.find((e) => e.id === "art")!.weight).toBe(6);
  });

  test("rejects data it cannot represent truthfully", () => {
    expect(() =>
      encodeProfile({
        items: [
          { id: "x", values: {} },
          { id: "x", values: {} },
        ],
        dimensions: [genre],
      }),
    ).toThrow(DataError);
    expect(() =>
      encodeProfile({ items: [{ id: "x", weight: 0, values: {} }], dimensions: [genre] }),
    ).toThrow(DataError);
    expect(() =>
      encodeProfile({
        items: [],
        dimensions: [
          { id: "d", label: "D", categories: [{ id: UNKNOWN_CATEGORY_ID, label: "?" }] },
        ],
      }),
    ).toThrow(DataError);
  });
});

describe("encoding several dimensions at once", () => {
  test("left out, the first dimension arranges, colours and shapes, and lightness is off", () => {
    const profile = encodeProfile({ items, dimensions: libraryDimensions });
    expect(profile.encoding).toEqual({
      arrange: "genre",
      color: "genre",
      shape: "genre",
      lightness: null,
    });
    expect(profile.legends.map((g) => [g.dimensionId, g.channels])).toEqual([
      ["genre", ["color", "shape", "arrange"]],
    ]);
    expect(profile.marks.every((mark) => mark.lightness === null)).toBe(true);
  });

  test("each mark takes its colour, shape and lightness from its own item's categories", () => {
    const profile = encodeProfile({ items, dimensions: libraryDimensions, encoding: combined });
    const byId = new Map(items.map((item) => [item.id, item]));
    const colour = new Map(profile.legends[0]!.entries.map((e) => [e.id, e.color]));
    for (const mark of profile.marks) {
      const item = byId.get(mark.id)!;
      expect(mark.color).toBe(colour.get(item.values.genre ?? UNKNOWN_CATEGORY_ID)!);
      const s = item.values.state;
      expect(mark.shape).toBe(s == null ? null : state.categories.findIndex((c) => c.id === s));
      const d = item.values.decade;
      expect(mark.lightness).toBe(
        d == null
          ? null
          : decade.categories.findIndex((c) => c.id === d) / (decade.categories.length - 1),
      );
      expect(mark.categories).toEqual({
        genre: item.values.genre ?? UNKNOWN_CATEGORY_ID,
        state: item.values.state ?? UNKNOWN_CATEGORY_ID,
        decade: item.values.decade ?? UNKNOWN_CATEGORY_ID,
      });
    }
  });

  test("one legend per dimension, colour first, each counting every item", () => {
    const profile = encodeProfile({ items, dimensions: libraryDimensions, encoding: combined });
    expect(profile.legends.map((g) => [g.dimensionId, g.channels])).toEqual([
      ["genre", ["color", "arrange"]],
      ["state", ["shape"]],
      ["decade", ["lightness"]],
    ]);
    for (const group of profile.legends)
      expect(group.entries.reduce((sum, e) => sum + e.count, 0)).toBe(items.length);
    // Legend swatches carry only the property their dimension drives.
    expect(
      profile.legends[1]!.entries.every((e) => e.color === "currentColor" && e.lightness === null),
    ).toBe(true);
    expect(
      profile.legends[2]!.entries.every((e) => e.color === "currentColor" && e.shape === 0),
    ).toBe(true);
  });

  test("a property can be turned off", () => {
    const profile = encodeProfile({
      items,
      dimensions: libraryDimensions,
      encoding: { arrange: "genre", color: null, shape: null },
    });
    expect(profile.marks.every((mark) => mark.color === "currentColor" && mark.shape === 0)).toBe(
      true,
    );
  });

  test("runs: arranged by genre, then split by state, then decade, inside each genre", () => {
    const profile = encodeProfile({ items, dimensions: libraryDimensions, encoding: combined });
    const rank = (d: Dimension, id: string | undefined) =>
      id === UNKNOWN_CATEGORY_ID ? 99 : d.categories.findIndex((c) => c.id === id);
    const keys = profile.marks.map((mark) => [
      rank(genre, mark.categories.genre),
      rank(state, mark.categories.state),
      rank(decade, mark.categories.decade),
    ]);
    const sorted = [...keys].sort((a, b) => a[0]! - b[0]! || a[1]! - b[1]! || a[2]! - b[2]!);
    expect(keys).toEqual(sorted);
  });

  test("lightness needs an ordered dimension, and every encoded id must exist", () => {
    expect(() =>
      encodeProfile({
        items,
        dimensions: libraryDimensions,
        encoding: { arrange: "genre", lightness: "genre" },
      }),
    ).toThrow(DataError);
    expect(() =>
      encodeProfile({ items, dimensions: libraryDimensions, encoding: { arrange: "nope" } }),
    ).toThrow(DataError);
    expect(() => encodeProfile({ items, dimensions: [] })).toThrow(DataError);
  });

  test("warns when a property shows more categories than it can keep apart", () => {
    const many: Dimension = {
      id: "n",
      label: "Number",
      categories: Array.from({ length: 12 }, (_, i) => ({ id: `c${i}`, label: `C${i}` })),
    };
    const twelve = Array.from({ length: 12 }, (_, i) => ({ id: `i${i}`, values: { n: `c${i}` } }));
    expect(encodeProfile({ items: twelve, dimensions: [many] }).warnings).toEqual([
      'Colour shows 12 categories of "Number"; beyond 10 they repeat, so only the legend tells them apart.',
      'Shape shows 12 categories of "Number"; beyond 5 they repeat, so only the legend tells them apart.',
    ]);
    expect(
      encodeProfile({ items, dimensions: libraryDimensions, encoding: combined }).warnings,
    ).toEqual([]);
  });
});

describe("the mark cap", () => {
  test("there is none by default, or when the cap is not a usable count", () => {
    const many = libraryItems(3000);
    for (const maxMarks of [undefined, Number.NaN, 0, -5]) {
      const profile = encodeProfile({ items: many, dimensions: [genre], maxMarks });
      expect(profile.itemsPerMark).toBe(1);
      expect(profile.marks).toHaveLength(many.length);
    }
  });

  test("above it, a mark only joins items that agree on every encoded dimension", () => {
    const many = libraryItems(3200);
    const profile = encodeProfile({
      items: many,
      dimensions: libraryDimensions,
      encoding: combined,
      maxMarks: 1500,
    });
    expect(profile.itemsPerMark).toBe(3);
    const byId = new Map(many.map((item) => [item.id, item]));
    for (const mark of profile.marks) {
      expect(mark.itemIds.length).toBeLessThanOrEqual(3);
      const values = mark.itemIds.map((id) => byId.get(id)!.values);
      for (const key of ["genre", "state", "decade"])
        expect(new Set(values.map((v) => v[key] ?? null)).size).toBe(1);
    }
    expect(new Set(profile.marks.flatMap((mark) => mark.itemIds)).size).toBe(many.length);
  });
});
