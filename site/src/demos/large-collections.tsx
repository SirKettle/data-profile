import { useMemo, useState } from "react";
import type { RidgeStyle } from "@data-profile/fingerprint";
import {
  FingerprintCanvas,
  FingerprintViewSwitch,
  useFingerprint,
  type FingerprintView,
} from "@data-profile/fingerprint/react";
import "@data-profile/fingerprint/styles.css";
import { dimensions, library } from "./library";

const views: FingerprintView[] = [
  { id: "genre", label: "Genre", encoding: { arrange: "genre" } },
  { id: "decade", label: "Published", encoding: { arrange: "decade" } },
];
const counts = [12, 120, 600, 3000, 30000];

export default function LargeCollections() {
  const [count, setCount] = useState(600);
  const [maxMarks, setMaxMarks] = useState(600);
  const [ridges, setRidges] = useState<NonNullable<RidgeStyle["show"]>>("auto");
  const items = useMemo(() => library(count), [count]);
  const fp = useFingerprint({ items, dimensions, views, maxMarks, unit: "books" });
  return (
    <div>
      <div className="demo-toolbar">
        <label>
          Books{" "}
          <select value={count} onChange={(event) => setCount(Number(event.target.value))}>
            {counts.map((value) => (
              <option key={value} value={value}>
                {value.toLocaleString()}
              </option>
            ))}
          </select>
        </label>
        <label>
          maxMarks{" "}
          <select value={maxMarks} onChange={(event) => setMaxMarks(Number(event.target.value))}>
            {[200, 600, 1500].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <label>
          Ridges{" "}
          <select
            value={ridges}
            onChange={(event) => setRidges(event.target.value as typeof ridges)}
          >
            {["auto", "always", "never"].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <FingerprintViewSwitch views={fp.views} value={fp.viewId} onChange={fp.setViewId} />
      </div>
      <FingerprintCanvas {...fp.canvasProps} title="A library" ridges={{ show: ridges }} />
      <p className="demo-note">
        {fp.layout.nodes.length.toLocaleString()} marks for {fp.layout.itemCount.toLocaleString()}{" "}
        books
        {fp.layout.itemsPerMark > 1 && `: one mark per ${fp.layout.itemsPerMark} books`}.
      </p>
    </div>
  );
}
