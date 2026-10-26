import type { Story, StoryDefault } from "@ladle/react";
import type { Encoding, Item } from "@data-profile/core";
import { layoutWaffle, type WaffleOptions } from "@data-profile/waffle";
import { useMemo, useState } from "react";
// The docs site's made-up library, so the stories and the docs show the same books.
import { dimensions, library } from "../../site/src/demos/library";
import { WaffleLegend, WaffleSvg } from "./WaffleSvg";

export default { title: "Waffle" } satisfies StoryDefault;

/** A waffle of `items` with a legend for its first encoded dimension. */
function Waffle({ items, ...options }: { items: readonly Item[] } & WaffleOptions) {
  const layout = layoutWaffle({ items, dimensions, ...options });
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <WaffleSvg layout={layout} unit="books" />
      <WaffleLegend layout={layout} />
      <small>
        {layout.columns} × {layout.rows} cells
        {layout.itemsPerMark > 1 && `, up to ${layout.itemsPerMark} books each`}
      </small>
    </div>
  );
}

export const FirstWaffle: Story = () => {
  const items = useMemo(() => library(100), []);
  return <Waffle items={items} />;
};

export const Views: Story = () => {
  const items = useMemo(() => library(320), []);
  const [arrange, setArrange] = useState("genre");
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div role="group" aria-label="View" style={{ display: "flex", gap: 6 }}>
        {dimensions.map((d) => (
          <button
            key={d.id}
            type="button"
            aria-pressed={d.id === arrange}
            onClick={() => setArrange(d.id)}
          >
            {d.label}
          </button>
        ))}
      </div>
      <Waffle items={items} encoding={{ arrange }} />
    </div>
  );
};

export const OneCellPerPercent: Story = () => {
  const items = useMemo(() => library(100), []);
  return <Waffle items={items} columns={10} />;
};

export const CombinedEncoding: Story = () => {
  const items = useMemo(() => library(320), []);
  const encoding: Encoding = {
    arrange: "genre",
    color: "genre",
    shape: "state",
    lightness: "decade",
  };
  return <Waffle items={items} encoding={encoding} />;
};

export const Grid: Story<{ count: number; columns: number; gap: number }> = ({
  count,
  columns,
  gap,
}) => {
  const items = useMemo(() => library(count), [count]);
  return <Waffle items={items} columns={columns || undefined} gap={gap} />;
};
Grid.args = { count: 150, columns: 0, gap: 0.15 };
Grid.argTypes = {
  count: { control: { type: "range", min: 0, max: 1000, step: 1 } },
  columns: { control: { type: "range", min: 0, max: 40, step: 1 } },
  gap: { control: { type: "range", min: 0, max: 0.9, step: 0.05 } },
};

export const Weighted: Story = () => {
  const items = useMemo(() => library(60).map((item, i) => ({ ...item, weight: 1 + (i % 4) })), []);
  return <Waffle items={items} columns={10} />;
};

export const LargeCollection: Story<{ count: number }> = ({ count }) => {
  const items = useMemo(() => library(count), [count]);
  return <Waffle items={items} />;
};
LargeCollection.args = { count: 20000 };
LargeCollection.argTypes = {
  count: { options: [1000, 5000, 20000, 100000], control: { type: "select" } },
};

export const Empty: Story = () => <Waffle items={[]} />;
