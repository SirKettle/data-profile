import type { Story, StoryDefault } from "@ladle/react";
import type { Item } from "@data-profile/core";
import {
  CategoryList,
  dotsRenderer,
  Legend,
  shapesRenderer,
  ViewSwitch,
  WaffleCanvas,
  useWaffle,
  type View,
} from "@data-profile/waffle/react";
import "@data-profile/waffle/styles.css";
import { useMemo } from "react";
// The docs site's made-up library, so the stories and the docs show the same books.
import { dimensions, library } from "../../site/src/demos/library";

export default { title: "Waffle" } satisfies StoryDefault;

const combined: View[] = [
  {
    id: "combined",
    label: "Combined",
    encoding: { arrange: "genre", color: "genre", shape: "state", lightness: "decade" },
  },
  { id: "genre", label: "Genre", encoding: { arrange: "genre" } },
  { id: "decade", label: "Published", encoding: { arrange: "decade" } },
  { id: "state", label: "Reading state", encoding: { arrange: "state" } },
];

/** The canvas, a view switch and a legend (or list) per encoded dimension: what most stories draw. */
function Waffle({
  items,
  views,
  columns,
  gap,
  renderer = shapesRenderer,
  list = false,
}: {
  items: readonly Item[];
  views?: View[];
  columns?: number;
  gap?: number;
  renderer?: typeof shapesRenderer;
  list?: boolean;
}) {
  const waffle = useWaffle({ items, dimensions, views, columns, gap, unit: "books" });
  const { layout } = waffle;
  return (
    <div style={{ maxWidth: 440, display: "grid", gap: 12 }}>
      {waffle.views.length > 1 && (
        <ViewSwitch views={waffle.views} value={waffle.viewId} onChange={waffle.setViewId} />
      )}
      {waffle.error && <p role="alert">{waffle.error.message}</p>}
      <WaffleCanvas {...waffle.canvasProps} title="A library" renderer={renderer} />
      {layout.legends.map((group) =>
        list ? (
          <CategoryList key={group.dimensionId} {...waffle.listProps(group)} />
        ) : (
          <Legend key={group.dimensionId} {...waffle.legendProps(group)} renderer={renderer} />
        ),
      )}
      <small>
        {layout.columns} × {layout.rows} cells
        {layout.itemsPerMark > 1 && `, up to ${layout.itemsPerMark} books each`}
      </small>
    </div>
  );
}

export const FirstWaffle: Story = () => {
  const items = useMemo(() => library(100), []);
  return <Waffle items={items} views={[combined[1]!]} />;
};

export const Views: Story = () => {
  const items = useMemo(() => library(320), []);
  return <Waffle items={items} />;
};

export const OneCellPerPercent: Story = () => {
  const items = useMemo(() => library(100), []);
  return <Waffle items={items} columns={10} />;
};

export const CombinedEncoding: Story = () => {
  const items = useMemo(() => library(320), []);
  return <Waffle items={items} views={combined} />;
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

export const Renderers: Story<{ renderer: "shapes" | "dots" }> = ({ renderer }) => {
  const items = useMemo(() => library(200), []);
  return (
    <Waffle
      items={items}
      views={combined}
      renderer={renderer === "dots" ? dotsRenderer : shapesRenderer}
    />
  );
};
Renderers.args = { renderer: "shapes" };
Renderers.argTypes = { renderer: { options: ["shapes", "dots"], control: { type: "radio" } } };

export const Weighted: Story = () => {
  const items = useMemo(() => library(60).map((item, i) => ({ ...item, weight: 1 + (i % 4) })), []);
  return <Waffle items={items} columns={10} />;
};

export const AccessibleList: Story = () => {
  const items = useMemo(() => library(320), []);
  return <Waffle items={items} list />;
};

export const LargeCollection: Story<{ count: number }> = ({ count }) => {
  const items = useMemo(() => library(count), [count]);
  return <Waffle items={items} views={combined} />;
};
LargeCollection.args = { count: 20000 };
LargeCollection.argTypes = {
  count: { options: [1000, 5000, 20000, 100000], control: { type: "select" } },
};

export const Empty: Story = () => <Waffle items={[]} />;

export const InvalidData: Story = () => {
  const items = useMemo(() => {
    const books = library(20);
    return [...books, books[0]!];
  }, []);
  return <Waffle items={items} />;
};
