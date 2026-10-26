import { useMemo } from "react";
import { markOpacity } from "@data-profile/fingerprint";
import {
  FingerprintCanvas,
  FingerprintLegend,
  useFingerprint,
  type FingerprintRenderer,
} from "@data-profile/fingerprint/react";
import "@data-profile/fingerprint/styles.css";
import { dimensions, library } from "./library";

// A book spine: a rounded bar along the ridge, with a band whose position shows the reading
// state. The mark is drawn centred on the origin, `node.size` across; the canvas positions and
// rotates it. A renderer must depend on its props alone, since marks are memoised.
const spines: FingerprintRenderer = {
  name: "spines",
  mark: ({ node }) => {
    const length = node.size;
    const width = node.size * 0.42;
    const band = node.shape === null ? null : (node.shape - 1) * length * 0.28;
    return (
      <g opacity={markOpacity(node)}>
        <rect
          x={-length / 2}
          y={-width / 2}
          width={length}
          height={width}
          rx={width * 0.25}
          fill={node.color}
        />
        {band !== null && (
          <rect
            x={band - length * 0.06}
            y={-width / 2}
            width={length * 0.12}
            height={width}
            fill="white"
            opacity={0.75}
          />
        )}
      </g>
    );
  },
};

export default function CustomRenderer() {
  const items = useMemo(() => library(260), []);
  const fp = useFingerprint({
    items,
    dimensions,
    views: [
      {
        id: "v",
        label: "Combined",
        encoding: { arrange: "genre", shape: "state", lightness: "decade" },
      },
    ],
  });
  return (
    <div className="demo-split">
      <FingerprintCanvas {...fp.canvasProps} title="A library of spines" renderer={spines} />
      <div>
        {fp.layout.legends.map((group) => (
          <FingerprintLegend key={group.dimensionId} {...fp.legendProps(group)} renderer={spines} />
        ))}
      </div>
    </div>
  );
}
