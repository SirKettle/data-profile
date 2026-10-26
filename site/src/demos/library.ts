import type { FingerprintDimension, FingerprintItem } from "@data-profile/fingerprint";

// A made-up library for the demos: books with a genre, a publication decade and a reading state.
// Any collection works the same way; only the dimensions and their categories change.
export const dimensions: FingerprintDimension[] = [
  {
    id: "genre",
    label: "Genre",
    categories: [
      { id: "fiction", label: "Fiction" },
      { id: "science", label: "Science" },
      { id: "history", label: "History" },
      { id: "poetry", label: "Poetry" },
      { id: "travel", label: "Travel" },
      { id: "cookery", label: "Cookery" },
      { id: "art", label: "Art" },
    ],
    unknownLabel: "Uncatalogued",
  },
  {
    id: "decade",
    label: "Published",
    // Decades run in order, so this dimension may drive lightness.
    ordered: true,
    categories: ["1950", "1960", "1970", "1980", "1990", "2000", "2010", "2020"].map((decade) => ({
      id: decade,
      label: `${decade}s`,
    })),
    unknownLabel: "Unknown date",
  },
  {
    id: "state",
    label: "Reading state",
    categories: [
      { id: "read", label: "Read" },
      { id: "reading", label: "Reading" },
      { id: "unread", label: "Unread" },
    ],
  },
];

// Deterministic "randomness", so every visit draws the same library.
function unit(key: string): number {
  let hash = 2166136261;
  for (let i = 0; i < key.length; i++) hash = Math.imul(hash ^ key.charCodeAt(i), 16777619);
  return (hash >>> 0) / 2 ** 32;
}
const pick = <T>(options: readonly T[], key: string, skew: number) =>
  options[Math.floor(unit(key) ** skew * options.length)]!;

const genres = dimensions[0]!.categories.map((category) => category.id);
const decades = dimensions[1]!.categories.map((category) => category.id).reverse();

/** `count` books, mostly fiction and mostly recent, with a few unknown values. */
export function library(count: number): FingerprintItem[] {
  return Array.from({ length: count }, (_, i) => {
    const id = `book-${i}`;
    return {
      id,
      values: {
        genre: unit(`${id}:g?`) < 0.03 ? null : pick(genres, `${id}:g`, 1.8),
        decade: unit(`${id}:d?`) < 0.05 ? null : pick(decades, `${id}:d`, 1.4),
        state: pick(["read", "unread", "reading"], `${id}:s`, 1.3),
      },
    };
  });
}
