import { unitHash } from "./hash";
import type { FingerprintDimension, FingerprintItem } from "./types";

/**
 * A synthetic, deterministic library: books with a genre, a decade and a reading state. It exists
 * to prove the package needs nothing but data, and to give demos and tests a non-trivial shape:
 * skewed genres, some unknown decades and an uneven reading state.
 */
export const libraryDimensions: FingerprintDimension[] = [
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
    ordered: true,
    categories: ["1950", "1960", "1970", "1980", "1990", "2000", "2010", "2020"].map((d) => ({
      id: d,
      label: `${d}s`,
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

/** Picks from `options` with a skew towards the start, deterministically from `key`. */
function skewed<T>(options: readonly T[], key: string, skew = 1.8): T {
  return options[Math.floor(unitHash(key) ** skew * options.length)]!;
}

export function libraryItems(count: number): FingerprintItem[] {
  const genres = libraryDimensions[0]!.categories.map((c) => c.id);
  const decades = libraryDimensions[1]!.categories.map((c) => c.id);
  return Array.from({ length: count }, (_, i) => {
    const id = `book-${String(i).padStart(5, "0")}`;
    return {
      id,
      values: {
        genre: unitHash(`${id}:g?`) < 0.03 ? null : skewed(genres, `${id}:g`),
        decade: unitHash(`${id}:d?`) < 0.05 ? null : skewed([...decades].reverse(), `${id}:d`, 1.4),
        state: skewed(["read", "unread", "reading"], `${id}:s`, 1.3),
      },
    };
  });
}
