import { describeProfile, markOpacity } from "@data-profile/core";
import type { WaffleLayout } from "@data-profile/waffle";

/**
 * Draws a waffle layout as SVG, for the stories: the waffle has no React canvas yet. A cell's
 * shape follows `cell.shape` (square, circle, diamond), and an unknown shape is an outline, so
 * shape encodings show too.
 */
export function WaffleSvg({ layout, unit = "items" }: { layout: WaffleLayout; unit?: string }) {
  return (
    <svg viewBox={`0 0 ${layout.width} ${layout.height}`} role="img" style={{ maxWidth: 420 }}>
      <title>{describeProfile(layout, unit)}</title>
      {layout.cells.map((cell) => {
        const r = cell.size / 2;
        const paint = { fill: cell.color, fillOpacity: markOpacity(cell) };
        if (cell.shape === null)
          return (
            <rect
              key={cell.id}
              x={cell.x - r * 0.8}
              y={cell.y - r * 0.8}
              width={r * 1.6}
              height={r * 1.6}
              fill="none"
              stroke={cell.color}
              strokeWidth={r * 0.3}
            />
          );
        switch (cell.shape % 3) {
          case 1:
            return <circle key={cell.id} cx={cell.x} cy={cell.y} r={r} {...paint} />;
          case 2:
            return (
              <polygon
                key={cell.id}
                points={`${cell.x},${cell.y - r} ${cell.x + r},${cell.y} ${cell.x},${cell.y + r} ${cell.x - r},${cell.y}`}
                {...paint}
              />
            );
          default:
            return (
              <rect
                key={cell.id}
                x={cell.x - r}
                y={cell.y - r}
                width={cell.size}
                height={cell.size}
                rx={r * 0.25}
                {...paint}
              />
            );
        }
      })}
    </svg>
  );
}

/** A legend from the layout's own legend group, matching `WaffleSvg`'s colours. */
export function WaffleLegend({ layout }: { layout: WaffleLayout }) {
  return (
    <ul style={{ listStyle: "none", padding: 0, display: "flex", flexWrap: "wrap", gap: 12 }}>
      {layout.legends[0]?.entries.map((entry) => (
        <li key={entry.id}>
          <span style={{ color: entry.color }}>■</span> {entry.label}{" "}
          {entry.count.toLocaleString("en-GB")}
        </li>
      ))}
    </ul>
  );
}
