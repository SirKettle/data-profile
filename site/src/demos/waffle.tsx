import { describeProfile, markOpacity } from "@data-profile/core";
import { layoutWaffle } from "@data-profile/waffle";
import { useMemo, useState } from "react";
import { dimensions, library } from "./library";

// The same books as the fingerprint demos, as a waffle. The layout is plain data, so this draws
// it with a few lines of SVG: no canvas component needed.
export default function Waffle() {
  const items = useMemo(() => library(320), []);
  const [arrange, setArrange] = useState("genre");
  const layout = layoutWaffle({ items, dimensions, encoding: { arrange } });
  const legend = layout.legends[0]!;
  return (
    <div style={{ maxWidth: 420 }}>
      <div role="group" aria-label="View" className="fp-views">
        {dimensions.map((d) => (
          <button
            key={d.id}
            type="button"
            className="fp-views__view"
            aria-pressed={d.id === arrange}
            onClick={() => setArrange(d.id)}
          >
            {d.label}
          </button>
        ))}
      </div>
      <svg viewBox={`0 0 ${layout.width} ${layout.height}`} role="img" style={{ marginTop: 12 }}>
        <title>{describeProfile(layout, "books")}</title>
        {layout.cells.map((cell) => (
          <rect
            key={cell.id}
            x={cell.x - cell.size / 2}
            y={cell.y - cell.size / 2}
            width={cell.size}
            height={cell.size}
            rx={cell.size * 0.2}
            fill={cell.color}
            fillOpacity={markOpacity(cell)}
          />
        ))}
      </svg>
      <ul style={{ listStyle: "none", padding: 0, display: "flex", flexWrap: "wrap", gap: 12 }}>
        {legend.entries.map((entry) => (
          <li key={entry.id}>
            <span style={{ color: entry.color }}>■</span> {entry.label} {entry.count}
          </li>
        ))}
      </ul>
    </div>
  );
}
