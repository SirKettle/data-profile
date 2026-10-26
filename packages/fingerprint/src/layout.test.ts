import { describe, expect, test } from "bun:test";
import { libraryDimensions, libraryItems } from "./fixtures";
import { FingerprintDataError, layoutFingerprint, UNKNOWN_CATEGORY_ID } from "./layout";
import type { FingerprintItem, RidgePattern } from "./types";

const [genre, decade, state] = libraryDimensions as [
  (typeof libraryDimensions)[0],
  (typeof libraryDimensions)[0],
  (typeof libraryDimensions)[0],
];
const items = libraryItems(400);
const patterns: RidgePattern[] = ["loop", "whorl", "arch"];

/** Deterministic shuffle, so the order-independence test is itself reproducible. */
const shuffled = <T>(values: readonly T[]) =>
  values
    .map((value, i) => ({ value, key: Math.sin(i * 12.9898) * 43758.5453 }))
    .sort((a, b) => (a.key % 1) - (b.key % 1))
    .map(({ value }) => value);

describe("layoutFingerprint", () => {
  test.each(patterns)("%s: one mark per item, all inside the frame, no NaN", (pattern) => {
    const layout = layoutFingerprint({ items, dimensions: [genre], form: { pattern } });
    expect(layout.nodes).toHaveLength(items.length);
    expect(layout.itemsPerMark).toBe(1);
    for (const node of layout.nodes) {
      for (const value of [node.x, node.y, node.size, node.rotation])
        expect(Number.isFinite(value)).toBe(true);
      expect(node.x).toBeGreaterThanOrEqual(0);
      expect(node.x).toBeLessThanOrEqual(layout.width);
      expect(node.y).toBeGreaterThanOrEqual(0);
      expect(node.y).toBeLessThanOrEqual(layout.height);
      expect(node.size).toBeGreaterThan(0);
    }
  });

  test("is identical whatever order the items arrive in", () => {
    const a = layoutFingerprint({ items, dimensions: [decade] });
    const b = layoutFingerprint({ items: shuffled(items), dimensions: [decade] });
    expect(b).toEqual(a);
  });

  test("the same seed gives the same picture; another seed moves the ridges", () => {
    expect(layoutFingerprint({ items, dimensions: [genre], seed: "a" })).toEqual(
      layoutFingerprint({ items, dimensions: [genre], seed: "a" }),
    );
    expect(layoutFingerprint({ items, dimensions: [genre], seed: "b" }).ridges).not.toEqual(
      layoutFingerprint({ items, dimensions: [genre], seed: "a" }).ridges,
    );
  });

  test("every mark keeps its item's identity across lenses", () => {
    const ids = (dimension: typeof genre) =>
      layoutFingerprint({ items, dimensions: [dimension] })
        .nodes.map((node) => node.id)
        .sort();
    expect(ids(decade)).toEqual(ids(genre));
    expect(ids(state)).toEqual(ids(genre));
  });

  test("every lens accounts for every item, unknowns included", () => {
    for (const dimension of libraryDimensions) {
      const layout = layoutFingerprint({ items, dimensions: [dimension] });
      expect(layout.legends[0]!.entries.reduce((sum, entry) => sum + entry.count, 0)).toBe(
        items.length,
      );
      expect(layout.itemCount).toBe(items.length);
    }
  });

  test("marks run in category order from the core outwards, unknown last", () => {
    const layout = layoutFingerprint({ items, dimensions: [genre] });
    const order = [...genre.categories.map((c) => c.id), UNKNOWN_CATEGORY_ID];
    const ranks = layout.nodes.map((node) => order.indexOf(node.categories.genre!));
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
    expect(layout.legends[0]!.entries.at(-1)).toMatchObject({
      id: UNKNOWN_CATEGORY_ID,
      label: "Uncatalogued",
      unknown: true,
    });
  });

  test("null, missing and unlisted values are unknown, and drawn", () => {
    const odd: FingerprintItem[] = [
      { id: "a", values: { genre: null } },
      { id: "b", values: {} },
      { id: "c", values: { genre: "not-a-genre" } },
      { id: "d", values: { genre: "poetry" } },
    ];
    const layout = layoutFingerprint({ items: odd, dimensions: [genre] });
    expect(layout.nodes).toHaveLength(4);
    expect(
      layout.nodes
        .filter((node) => node.categories.genre === UNKNOWN_CATEGORY_ID)
        .map((node) => node.id),
    ).toEqual(["a", "b", "c"]);
  });

  test("the unknown category is listed only when it has items", () => {
    const known = [{ id: "a", values: { state: "read" } }];
    expect(
      layoutFingerprint({ items: known, dimensions: [state] }).legends[0]!.entries.map(
        (entry) => entry.id,
      ),
    ).toEqual(["read", "reading", "unread"]);
  });

  test("an empty collection still draws its ridges", () => {
    const layout = layoutFingerprint({ items: [], dimensions: [genre] });
    expect(layout.nodes).toEqual([]);
    expect(layout.ridges.length).toBeGreaterThan(0);
    expect(layout.itemsPerMark).toBe(1);
  });

  test("one item is one full-size mark", () => {
    const layout = layoutFingerprint({
      items: [{ id: "only", values: { genre: "art" } }],
      dimensions: [genre],
    });
    expect(layout.nodes).toHaveLength(1);
    expect(layout.nodes[0]).toMatchObject({
      id: "only",
      categories: { genre: "art" },
      itemIds: ["only"],
    });
  });

  test("above the cap, marks share items honestly: none dropped, none mixed", () => {
    const many = libraryItems(3200);
    const layout = layoutFingerprint({ items: many, dimensions: [genre], maxMarks: 1500 });
    // An explicit cap overrides the default of 600.
    expect(layout.itemsPerMark).toBe(3);
    expect(layout.nodes.length).toBeLessThanOrEqual(1500 + genre.categories.length + 1);
    const covered = layout.nodes.flatMap((node) => node.itemIds);
    expect(new Set(covered).size).toBe(many.length);
    const categoryOf = new Map(many.map((item) => [item.id, item.values.genre ?? null]));
    for (const node of layout.nodes) {
      expect(node.itemIds.length).toBeLessThanOrEqual(3);
      for (const id of node.itemIds) {
        const value = categoryOf.get(id);
        const category = node.categories.genre;
        expect(category === UNKNOWN_CATEGORY_ID ? value === null : value === category).toBe(true);
      }
    }
  });

  test("mark area is proportional to weight", () => {
    const layout = layoutFingerprint({
      items: [
        { id: "one", weight: 1, values: { genre: "art" } },
        { id: "four", weight: 4, values: { genre: "art" } },
      ],
      dimensions: [genre],
    });
    const size = (id: string) => layout.nodes.find((node) => node.id === id)!.size;
    expect((size("four") / size("one")) ** 2).toBeCloseTo(4);
  });

  test("small collections keep enough ridges to read as a fingerprint", () => {
    const layout = layoutFingerprint({
      items: libraryItems(12),
      dimensions: [genre],
      minRidges: 6,
    });
    expect(layout.ridgeSpacing).toBeLessThanOrEqual(layout.width / 2 / 6);
    expect(layout.ridges.length).toBeGreaterThanOrEqual(6);
  });

  test("the form option is resolved and reported", () => {
    const layout = layoutFingerprint({
      items,
      dimensions: [genre],
      form: { pattern: "whorl", tilt: 40 },
    });
    expect(layout.form.pattern).toBe("whorl");
    expect(layout.form.tilt).toBe(10);
  });

  test("ridges stay inside the outline", () => {
    for (const pattern of patterns) {
      const { ridges, width, height } = layoutFingerprint({
        items,
        dimensions: [genre],
        form: { pattern },
      });
      for (const [x, y] of ridges.flat())
        expect(Math.hypot((x - width / 2) / 180, (y - height / 2) / 240)).toBeLessThanOrEqual(1);
    }
  });

  const sizes = [12, 400, 1500];
  test.each(patterns.flatMap((pattern) => sizes.map((size) => [pattern, size] as const)))(
    "%s, %i items: no mark overlaps another",
    (pattern, size) => {
      const { nodes } = layoutFingerprint({
        items: libraryItems(size),
        dimensions: [genre],
        form: { pattern },
      });
      let closest = Infinity;
      for (const a of nodes)
        for (const b of nodes)
          if (a !== b) closest = Math.min(closest, Math.hypot(a.x - b.x, a.y - b.y) / a.size);
      // Equal weights, so equal footprints: centres a footprint apart just touch.
      expect(closest).toBeGreaterThanOrEqual(1);
    },
  );

  test("rejects data it cannot draw truthfully", () => {
    expect(() =>
      layoutFingerprint({
        items: [
          { id: "x", values: {} },
          { id: "x", values: {} },
        ],
        dimensions: [genre],
      }),
    ).toThrow(FingerprintDataError);
    expect(() =>
      layoutFingerprint({ items: [{ id: "x", weight: 0, values: {} }], dimensions: [genre] }),
    ).toThrow(FingerprintDataError);
    expect(() =>
      layoutFingerprint({
        items: [],
        dimensions: [
          {
            id: "d",
            label: "D",
            categories: [{ id: UNKNOWN_CATEGORY_ID, label: "?" }],
          },
        ],
      }),
    ).toThrow(FingerprintDataError);
  });
});
