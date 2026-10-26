import { Legend, ViewSwitch, WaffleCanvas, useWaffle } from "@data-profile/waffle/react";
import "@data-profile/waffle/styles.css";
import { useMemo } from "react";
import { dimensions, library } from "./library";

// The same books as the fingerprint demos, as a waffle: the same views, the same legends, and
// choosing a category highlights its cells.
export default function Waffle() {
  const items = useMemo(() => library(320), []);
  const waffle = useWaffle({ items, dimensions, unit: "books" });
  return (
    <div style={{ maxWidth: 420, display: "grid", gap: 12 }}>
      <ViewSwitch views={waffle.views} value={waffle.viewId} onChange={waffle.setViewId} />
      <WaffleCanvas {...waffle.canvasProps} title="A library" />
      {waffle.layout.legends.map((group) => (
        <Legend key={group.dimensionId} {...waffle.legendProps(group)} />
      ))}
    </div>
  );
}
