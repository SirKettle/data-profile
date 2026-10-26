import { useMemo } from "react";
import type { FingerprintAnnotation } from "@data-profile/fingerprint";
import {
  FingerprintCanvas,
  FingerprintLegend,
  FingerprintViewSwitch,
  useFingerprint,
  type FingerprintView,
} from "@data-profile/fingerprint/react";
import "@data-profile/fingerprint/styles.css";
import { dimensions, library } from "./library";

// One combined view showing three things at once, then one view per dimension.
const views: FingerprintView[] = [
  {
    id: "combined",
    label: "Combined",
    encoding: { arrange: "genre", color: "genre", shape: "state", lightness: "decade" },
  },
  { id: "genre", label: "Genre", encoding: { arrange: "genre" } },
  { id: "decade", label: "Published", encoding: { arrange: "decade" } },
  { id: "state", label: "Reading state", encoding: { arrange: "state" } },
];

// Callouts: you write the words; the canvas points at a real mark of the named categories.
const annotations: FingerprintAnnotation[] = [
  {
    id: "fiction",
    dimensionId: "genre",
    categoryIds: ["fiction"],
    title: "Mostly fiction",
    body: "The largest genre forms the core.",
  },
  {
    id: "unread",
    dimensionId: "state",
    categoryIds: ["unread"],
    title: "A long reading list",
    body: "Unread books, wherever they sit.",
  },
];

export default function CombinedView() {
  const items = useMemo(() => library(320), []);
  const fp = useFingerprint({ items, dimensions, views, unit: "books" });
  return (
    <div className="demo-split">
      <div>
        <FingerprintViewSwitch views={fp.views} value={fp.viewId} onChange={fp.setViewId} />
        <FingerprintCanvas {...fp.canvasProps} title="A library" annotations={annotations} />
      </div>
      <div>
        {fp.layout.legends.map((group) => (
          <FingerprintLegend key={group.dimensionId} {...fp.legendProps(group)} hideEmpty />
        ))}
      </div>
    </div>
  );
}
