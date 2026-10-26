import { markOpacity } from "@data-profile/core";
import type { Renderer } from "./types";

/**
 * The default: five shapes (circle, rounded square, triangle, diamond, hexagon) by `node.shape`, a
 * ring in the mark's colour when its shape category is unknown, and lightness as opacity.
 */
export const shapesRenderer: Renderer = {
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
export const dotsRenderer: Renderer = {
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
