import type { Dimension, Item } from "@data-profile/core";
import { Legend, ViewSwitch, WaffleCanvas, useWaffle } from "@data-profile/waffle/react";
import "@data-profile/waffle/styles.css";

const dimensions: Dimension[] = [
  {
    id: "genre",
    label: "Genre",
    categories: [
      { id: "fiction", label: "Fiction" },
      { id: "poetry", label: "Poetry" },
    ],
  },
  {
    id: "state",
    label: "Reading state",
    categories: [
      { id: "read", label: "Read" },
      { id: "unread", label: "Unread" },
    ],
  },
];

export function Library({ items }: { items: readonly Item[] }) {
  const waffle = useWaffle({ items, dimensions, columns: 10, unit: "books" });
  return (
    <>
      <ViewSwitch views={waffle.views} value={waffle.viewId} onChange={waffle.setViewId} />
      <WaffleCanvas {...waffle.canvasProps} title="My library" />
      {waffle.layout.legends.map((group) => (
        <Legend key={group.dimensionId} {...waffle.legendProps(group)} />
      ))}
    </>
  );
}
