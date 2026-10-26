import { useMemo, useState } from "react";
import {
  dotsRenderer,
  FingerprintCanvas,
  FingerprintLegend,
  shapesRenderer,
  useFingerprint,
} from "@data-profile/fingerprint/react";
import "@data-profile/fingerprint/styles.css";
import { dimensions, library } from "./library";

const renderers = { shapes: shapesRenderer, dots: dotsRenderer };

export default function BuiltInRenderers() {
  const [name, setName] = useState<keyof typeof renderers>("shapes");
  const renderer = renderers[name];
  const items = useMemo(() => library(200), []);
  const fp = useFingerprint({
    items,
    dimensions,
    // Colour by genre, shape by reading state.
    views: [{ id: "v", label: "Genre and state", encoding: { arrange: "genre", shape: "state" } }],
  });
  return (
    <div>
      <div role="group" aria-label="Renderer" className="demo-toolbar">
        {(["shapes", "dots"] as const).map((option) => (
          <button key={option} aria-pressed={name === option} onClick={() => setName(option)}>
            {option}Renderer
          </button>
        ))}
      </div>
      <div className="demo-split">
        <FingerprintCanvas {...fp.canvasProps} title="A library" renderer={renderer} />
        <div>
          {fp.layout.legends.map((group) => (
            <FingerprintLegend
              key={group.dimensionId}
              {...fp.legendProps(group)}
              renderer={renderer}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
