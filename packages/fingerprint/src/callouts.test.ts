import { describe, expect, test } from "bun:test";
import { CALLOUT_HEIGHT, placeCallouts } from "./callouts";
import { describeLayout } from "./describe";
import { libraryDimensions, libraryItems } from "./fixtures";
import { layoutFingerprint } from "./layout";

const genre = libraryDimensions[0]!;
const layout = layoutFingerprint({ items: libraryItems(430), dimensions: [genre] });

describe("placeCallouts", () => {
  test("each leader points at a real mark of the categories it names", () => {
    const placed = placeCallouts(layout, [
      { id: "a", categoryIds: ["fiction", "science"], title: "Fiction and science lead" },
      { id: "b", categoryIds: ["art"], title: "A little art" },
    ]);
    expect(placed).toHaveLength(2);
    for (const callout of placed) {
      const mark = layout.nodes.find(
        (node) => node.x === callout.anchor.x && node.y === callout.anchor.y,
      );
      expect(mark).toBeDefined();
      expect(callout.annotation.categoryIds).toContain(mark!.categories.genre);
      expect(callout.side).toBe(callout.anchor.x < layout.width / 2 ? "left" : "right");
    }
  });

  test("an annotation about categories with no marks is left out", () => {
    expect(
      placeCallouts(layout, [{ id: "x", categoryIds: ["no-such"], title: "Nothing" }]),
    ).toEqual([]);
  });

  test("labels on one side never overlap and stay inside the frame", () => {
    const many = genre.categories.map((c) => ({ id: c.id, categoryIds: [c.id], title: c.label }));
    const placed = placeCallouts(layout, many);
    for (const side of ["left", "right"] as const) {
      const tops = placed.filter((c) => c.side === side).map((c) => c.labelY);
      for (let i = 1; i < tops.length; i++)
        expect(tops[i]! - tops[i - 1]!).toBeGreaterThanOrEqual(CALLOUT_HEIGHT - 1e-9);
      for (const top of tops) expect(top).toBeGreaterThanOrEqual(0);
    }
    expect(placed.map((c) => c.number)).toEqual(placed.map((_, i) => i + 1));
  });
});

describe("describeLayout", () => {
  test("names the total and the largest categories with the legend's own counts", () => {
    const text = describeLayout(layout, "books");
    expect(text).toStartWith("430 books by genre: ");
    const top = [...layout.legends[0]!.entries].sort((a, b) => b.count - a.count)[0]!;
    expect(text).toContain(`${top.label} ${top.count}`);
  });

  test("says when marks stand for several items, and handles an empty collection", () => {
    const big = layoutFingerprint({ items: libraryItems(3200), dimensions: [genre] });
    expect(describeLayout(big)).toContain("Each mark stands for up to 6 items.");
    expect(describeLayout(layoutFingerprint({ items: [], dimensions: [genre] }), "books")).toBe(
      "No books yet.",
    );
  });
});

describe("placeCallouts anchors", () => {
  test("callouts about overlapping categories still get anchors far enough apart to tell apart", () => {
    const placed = placeCallouts(layout, [
      { id: "a", categoryIds: ["fiction"], title: "A" },
      { id: "b", categoryIds: ["fiction"], title: "B" },
      { id: "c", categoryIds: ["fiction", "science"], title: "C" },
    ]);
    for (let i = 0; i < placed.length; i++)
      for (let j = i + 1; j < placed.length; j++)
        expect(
          Math.hypot(
            placed[i]!.anchor.x - placed[j]!.anchor.x,
            placed[i]!.anchor.y - placed[j]!.anchor.y,
          ),
        ).toBeGreaterThanOrEqual(28);
  });
});
