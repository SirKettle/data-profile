import { describe, expect, test } from "bun:test";
import { describeProfile } from "./describe";
import { encodeProfile } from "./encode";
import { libraryDimensions, libraryItems } from "./fixtures";

const [genre, decade, state] = libraryDimensions;

describe("describeProfile", () => {
  test("names the total and the largest categories with the legend's own counts", () => {
    const profile = encodeProfile({ items: libraryItems(430), dimensions: [genre!] });
    const text = describeProfile(profile, "books");
    expect(text).toStartWith("430 books by genre: ");
    const top = [...profile.legends[0]!.entries].sort((a, b) => b.count - a.count)[0]!;
    expect(text).toContain(`${top.label} ${top.count}`);
  });

  test("says which dimension each property shows when they differ", () => {
    const profile = encodeProfile({
      items: libraryItems(100),
      dimensions: [genre!, decade!, state!],
      encoding: { arrange: "genre", shape: "state", lightness: "decade" },
    });
    expect(describeProfile(profile)).toContain(
      "Colour shows genre, shape shows reading state, lightness shows published (fainter is earlier).",
    );
  });

  test("says when marks stand for several items, and handles an empty dataset", () => {
    const big = encodeProfile({ items: libraryItems(3200), dimensions: [genre!], maxMarks: 600 });
    expect(describeProfile(big)).toContain("Each mark stands for up to 6 items.");
    expect(describeProfile(encodeProfile({ items: [], dimensions: [genre!] }), "books")).toBe(
      "No books yet.",
    );
  });
});
