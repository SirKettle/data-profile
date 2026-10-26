import type { FingerprintAnnotation } from "@data-profile/fingerprint";

export const annotations: FingerprintAnnotation[] = [
  {
    id: "lead",
    dimensionId: "genre",
    categoryIds: ["fiction"],
    title: "Mostly fiction",
    body: "62% of the library.",
  },
];
