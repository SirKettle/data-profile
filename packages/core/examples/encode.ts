import { describeProfile, encodeProfile, type Dimension, type Item } from "@data-profile/core";

const dimensions: Dimension[] = [
  {
    id: "genre",
    label: "Genre",
    categories: [
      { id: "fiction", label: "Fiction" },
      { id: "poetry", label: "Poetry" },
    ],
  },
];
const items: Item[] = [
  { id: "a", values: { genre: "fiction" } },
  { id: "b", values: { genre: "poetry" } },
  { id: "c", values: { genre: null } },
];

const profile = encodeProfile({ items, dimensions, maxMarks: 600 });
profile.marks; // ordered: fiction, poetry, then unknown, each with color, shape and lightness
profile.legends; // one group per encoded dimension, with counts
describeProfile(profile, "books"); // "3 books by genre: Fiction 1, Poetry 1, Unknown 1."
