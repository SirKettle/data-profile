import type { Story, StoryDefault } from "@ladle/react";
import { useMemo } from "react";
import type {
  FingerprintAnnotation,
  FingerprintItem,
  RidgePattern,
  RidgeStyle,
} from "@data-profile/fingerprint";
import {
  dotsRenderer,
  FingerprintCanvas,
  FingerprintLegend,
  FingerprintList,
  FingerprintViewSwitch,
  shapesRenderer,
  useFingerprint,
  type FingerprintView,
} from "@data-profile/fingerprint/react";
import "@data-profile/fingerprint/styles.css";
// The docs site's made-up library, so the stories and the docs show the same books.
import { dimensions, library } from "../../site/src/demos/library";

export default { title: "Fingerprint" } satisfies StoryDefault;

const combined: FingerprintView[] = [
  {
    id: "combined",
    label: "Combined",
    encoding: { arrange: "genre", color: "genre", shape: "state", lightness: "decade" },
  },
  { id: "genre", label: "Genre", encoding: { arrange: "genre" } },
  { id: "decade", label: "Published", encoding: { arrange: "decade" } },
  { id: "state", label: "Reading state", encoding: { arrange: "state" } },
];

/** The canvas, a view switch and a legend per encoded dimension: what most stories draw. */
function Print({
  items,
  views,
  renderer = shapesRenderer,
  pattern,
  ridges,
  annotations,
  list = false,
}: {
  items: readonly FingerprintItem[];
  views?: FingerprintView[];
  renderer?: typeof shapesRenderer;
  pattern?: RidgePattern;
  ridges?: RidgeStyle;
  annotations?: FingerprintAnnotation[];
  list?: boolean;
}) {
  const fp = useFingerprint({
    items,
    dimensions,
    views,
    unit: "books",
    form: pattern ? { pattern } : undefined,
  });
  return (
    <div style={{ maxWidth: 440, display: "grid", gap: 12 }}>
      {fp.views.length > 1 && (
        <FingerprintViewSwitch views={fp.views} value={fp.viewId} onChange={fp.setViewId} />
      )}
      {fp.error && <p role="alert">{fp.error.message}</p>}
      <FingerprintCanvas
        {...fp.canvasProps}
        title="A library"
        renderer={renderer}
        ridges={ridges}
        annotations={annotations}
      />
      {fp.layout.legends.map((group) =>
        list ? (
          <FingerprintList key={group.dimensionId} {...fp.listProps(group)} />
        ) : (
          <FingerprintLegend
            key={group.dimensionId}
            {...fp.legendProps(group)}
            renderer={renderer}
          />
        ),
      )}
    </div>
  );
}

export const FirstFingerprint: Story = () => {
  const items = useMemo(() => library(40), []);
  return <Print items={items} views={[combined[1]!]} />;
};

export const Views: Story = () => {
  const items = useMemo(() => library(320), []);
  return <Print items={items} />;
};

export const CombinedEncoding: Story = () => {
  const items = useMemo(() => library(320), []);
  return <Print items={items} views={combined} />;
};

export const Patterns: Story<{ pattern: RidgePattern; count: number }> = ({ pattern, count }) => {
  const items = useMemo(() => library(count), [count]);
  return <Print items={items} pattern={pattern} />;
};
Patterns.args = { pattern: "whorl", count: 120 };
Patterns.argTypes = {
  pattern: { options: ["loop", "whorl", "arch"], control: { type: "radio" } },
  count: { control: { type: "range", min: 1, max: 600, step: 1 } },
};

export const Renderers: Story<{ renderer: "shapes" | "dots" }> = ({ renderer }) => {
  const items = useMemo(() => library(200), []);
  return (
    <Print
      items={items}
      views={combined}
      renderer={renderer === "dots" ? dotsRenderer : shapesRenderer}
    />
  );
};
Renderers.args = { renderer: "shapes" };
Renderers.argTypes = { renderer: { options: ["shapes", "dots"], control: { type: "radio" } } };

export const Ridges: Story<{ show: NonNullable<RidgeStyle["show"]> }> = ({ show }) => {
  const items = useMemo(() => library(90), []);
  return <Print items={items} ridges={{ show }} />;
};
Ridges.args = { show: "auto" };
Ridges.argTypes = { show: { options: ["auto", "always", "never"], control: { type: "radio" } } };

export const Callouts: Story = () => {
  const items = useMemo(() => library(320), []);
  return (
    <Print
      items={items}
      views={combined}
      annotations={[
        {
          id: "fiction",
          dimensionId: "genre",
          categoryIds: ["fiction"],
          title: "Mostly fiction",
          body: "The largest genre forms the core.",
        },
        {
          id: "unread",
          dimensionId: "state",
          categoryIds: ["unread"],
          title: "A long reading list",
        },
      ]}
    />
  );
};

export const AccessibleList: Story = () => {
  const items = useMemo(() => library(320), []);
  return <Print items={items} list />;
};

export const LargeCollection: Story<{ count: number }> = ({ count }) => {
  const items = useMemo(() => library(count), [count]);
  return <Print items={items} views={combined} />;
};
LargeCollection.args = { count: 20000 };
LargeCollection.argTypes = {
  count: { options: [1000, 5000, 20000, 100000], control: { type: "select" } },
};

export const Empty: Story = () => <Print items={[]} />;

export const InvalidData: Story = () => {
  const items = useMemo(() => {
    const books = library(20);
    return [...books, books[0]!];
  }, []);
  return <Print items={items} />;
};
