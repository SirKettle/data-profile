import type { ReactNode } from "react";
import { markOpacity } from "../opacity";
import type { FingerprintLegendGroup, FingerprintNode } from "../types";

export { markOpacity };

/** What a renderer's `mark` receives. */
export interface FingerprintMarkProps {
  /** Carries the resolved `color`, `shape` (null when unknown) and `lightness` (null when full strength). */
  node: FingerprintNode;
  /** Prefix for any ids the renderer's `defs` declared, unique to this drawing. */
  idPrefix: string;
}

/**
 * Draws marks. `mark` draws one mark centred on the origin, `node.size` across, with the ridge
 * running along the x axis: the canvas positions and rotates it, so a renderer never changes
 * layout, counts or selection. It should honour `node.color`, `node.shape` and `node.lightness`
 * (see `markOpacity`), since those carry data. `defs` runs once per drawing. Marks are memoised and
 * selection is drawn by the canvas (dimming the rest), so `mark` must depend on its props alone.
 * The canvas transitions the fill, fill-opacity and stroke of each mark's top-level elements.
 */
export interface FingerprintRenderer {
  /** A name for debugging and for telling renderers apart. */
  name: string;
  /** Shared SVG definitions (gradients, patterns, symbols), rendered once per drawing. */
  defs?: (props: { idPrefix: string; legends: readonly FingerprintLegendGroup[] }) => ReactNode;
  /** Draws one mark. */
  mark: (props: FingerprintMarkProps) => ReactNode;
}

/**
 * The default: five shapes (circle, rounded square, triangle, diamond, hexagon) by `node.shape`, a
 * ring in the mark's colour when its shape category is unknown, and lightness as opacity.
 */
export const shapesRenderer: FingerprintRenderer = {
  name: "shapes",
  mark: ({ node }) => {
    const r = node.size / 2;
    const paint = {
      fill: node.color,
      fillOpacity: markOpacity(node),
    };
    if (node.shape === null)
      return (
        <circle
          r={r * 0.8}
          fill="none"
          stroke={node.color}
          strokeOpacity={markOpacity(node)}
          strokeWidth={r * 0.35}
        />
      );
    switch (node.shape % 5) {
      case 1:
        return (
          <rect
            x={-r * 0.85}
            y={-r * 0.85}
            width={r * 1.7}
            height={r * 1.7}
            rx={r * 0.25}
            {...paint}
          />
        );
      case 2:
        return (
          <polygon points={`0,${-r} ${r * 0.95},${r * 0.75} ${-r * 0.95},${r * 0.75}`} {...paint} />
        );
      case 3:
        return <polygon points={`0,${-r} ${r},0 0,${r} ${-r},0`} {...paint} />;
      case 4:
        return (
          <polygon
            points={Array.from({ length: 6 }, (_, i) => {
              const a = (Math.PI / 3) * i;
              return `${(r * Math.cos(a)).toFixed(2)},${(r * Math.sin(a)).toFixed(2)}`;
            }).join(" ")}
            {...paint}
          />
        );
      default:
        return <circle r={r} {...paint} />;
    }
  },
};

/** Every mark a dot, shape ignored. Only for when shape must carry nothing. */
export const dotsRenderer: FingerprintRenderer = {
  name: "dots",
  mark: ({ node }) =>
    node.shape === null ? (
      <circle
        r={node.size * 0.4}
        fill="none"
        stroke={node.color}
        strokeOpacity={markOpacity(node)}
        strokeWidth={node.size * 0.18}
      />
    ) : (
      <circle r={node.size / 2} fill={node.color} fillOpacity={markOpacity(node)} />
    ),
};
