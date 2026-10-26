import "./test-setup";
import { encodeProfile, type Dimension, type Item } from "@data-profile/core";
import { afterEach, describe, expect, test } from "bun:test";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { useMemo } from "react";
import { CategoryList, Legend, ViewSwitch } from "./controls";
import { MarkCanvas } from "./MarkCanvas";
import { dotsRenderer, shapesRenderer } from "./renderers";
import type { PlacedMark, Renderer } from "./types";
import { useViews } from "./useViews";

afterEach(cleanup);

const dimensions: Dimension[] = [
  {
    id: "genre",
    label: "Genre",
    categories: [
      { id: "fiction", label: "Fiction" },
      { id: "poetry", label: "Poetry" },
      { id: "history", label: "History" },
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
const items: Item[] = Array.from({ length: 30 }, (_, i) => ({
  id: `b${i}`,
  values: {
    genre: ["fiction", "fiction", "poetry", "history", null][i % 5],
    state: i % 3 ? "read" : "unread",
  },
}));

/** The least a view does: core's marks, placed in a row. */
function placed(arrange: string) {
  const { marks, ...profile } = encodeProfile({ items, dimensions, encoding: { arrange } });
  return {
    ...profile,
    marks: marks.map((mark, i): PlacedMark => ({
      ...mark,
      x: 10 + i * 20,
      y: 10,
      size: 16,
      rotation: 0,
    })),
  };
}

/** A whole view built from the shared pieces: switch, canvas, a legend and a list per group. */
function Harness({ renderer }: { renderer?: Renderer }) {
  const state = useViews({ dimensions, unit: "books" });
  const arrange = state.view!.encoding.arrange;
  // Memoised, as a view's hook memoises its layout: a selection must not hand the canvas new marks.
  const layout = useMemo(() => placed(arrange), [arrange]);
  return (
    <>
      <ViewSwitch views={state.views} value={state.viewId} onChange={state.setViewId} />
      <MarkCanvas
        marks={layout.marks}
        legends={layout.legends}
        arrange={layout.encoding.arrange}
        viewBox={[0, 0, 600, 20]}
        title="A shelf"
        description="Thirty books"
        renderer={renderer}
        selected={state.selected}
        onSelect={state.setSelected}
        unit="books"
      />
      {layout.legends.map((group) => (
        <Legend key={group.dimensionId} {...state.legendProps(group)} renderer={renderer} />
      ))}
      {layout.legends.map((group) => (
        <CategoryList key={group.dimensionId} {...state.listProps(group)} />
      ))}
    </>
  );
}

const marks = (container: HTMLElement) => [...container.querySelectorAll<SVGGElement>(".dp-mark")];
/** The marks the canvas's selection rule leaves at full strength, or null with no selection. */
function selectedMarks(container: HTMLElement) {
  const css = container.querySelector(".dp-canvas > style")!.textContent!;
  const rule = css.match(/:not\(\[data-d(\d+)="((?:[^"\\]|\\.)*)"\]\)\{opacity:/);
  if (!rule) return null;
  return marks(container).filter((g) => g.getAttribute(`data-d${rule[1]}`) === rule[2]);
}

describe("shared components", () => {
  test("the canvas draws one mark per placed mark, at its place, as one named image", () => {
    const { container } = render(<Harness />);
    expect(marks(container)).toHaveLength(items.length);
    expect(marks(container)[0]!.style.transform).toBe("translate(10px, 10px) rotate(0deg)");
    const svg = container.querySelector("svg[role=img]")!;
    expect(svg.getAttribute("viewBox")).toBe("0 0 600 20");
    expect(svg.querySelector("title")!.textContent).toBe("A shelf");
    expect(svg.querySelector("desc")!.textContent).toBe("Thirty books");
  });

  test("a legend toggle selects a category, dims the rest, announces it, and clears", () => {
    const { container } = render(<Harness />);
    const toggle = container.querySelector<HTMLButtonElement>(".dp-legend__toggle")!;
    act(() => toggle.click());
    expect(toggle.getAttribute("aria-pressed")).toBe("true");
    const chosen = selectedMarks(container)!;
    expect(chosen.length).toBe(12);
    expect(chosen.every((g) => g.dataset.category === "fiction")).toBe(true);
    expect(container.querySelector("[role=status]")!.textContent).toBe("Fiction: 12 books.");
    act(() => toggle.click());
    expect(selectedMarks(container)).toBeNull();
  });

  test("clicking a mark selects its category of the arranging dimension", () => {
    const { container } = render(<Harness />);
    const mark = marks(container).at(-1)!;
    fireEvent.click(mark);
    expect(selectedMarks(container)).toContain(mark);
  });

  test("switching view keeps every mark element, moves them, and clears the selection", () => {
    const { container } = render(<Harness />);
    const before = new Set(marks(container));
    act(() => container.querySelector<HTMLButtonElement>(".dp-legend__toggle")!.click());
    const second = container.querySelectorAll<HTMLButtonElement>(".dp-views__view")[1]!;
    act(() => second.click());
    expect(second.getAttribute("aria-pressed")).toBe("true");
    expect(marks(container).every((g) => before.has(g))).toBe(true);
    expect(selectedMarks(container)).toBeNull();
    expect(container.querySelector("caption")!.textContent).toBe("Reading state: 30 books");
  });

  test("renderers change the drawing, never positions; swatches use the same renderer", () => {
    const a = render(<Harness renderer={shapesRenderer} />);
    const places = marks(a.container).map((g) => g.style.transform);
    expect(a.container.querySelectorAll(".dp-mark rect, .dp-mark polygon").length).toBeGreaterThan(
      0,
    );
    cleanup();
    const b = render(<Harness renderer={dotsRenderer} />);
    expect(marks(b.container).map((g) => g.style.transform)).toEqual(places);
    expect(b.container.querySelectorAll(".dp-mark rect, .dp-mark polygon")).toHaveLength(0);
    expect(b.container.querySelectorAll(".dp-legend__swatch circle").length).toBeGreaterThan(0);
  });

  test("selecting re-renders no marks: dimming is one style rule", () => {
    let drawn = 0;
    const counting: Renderer = {
      name: "counting",
      mark: (props) => {
        drawn += 1;
        return shapesRenderer.mark(props);
      },
    };
    const { container } = render(<Harness renderer={counting} />);
    const swatches = container.querySelectorAll(".dp-legend__swatch").length;
    drawn = 0;
    act(() => container.querySelector<HTMLButtonElement>(".dp-legend__toggle")!.click());
    expect(drawn).toBeLessThanOrEqual(swatches);
  });

  test("the list's counts add up to the total, with shares of it", () => {
    const { container } = render(<Harness />);
    const list = container.querySelector(".dp-list")!;
    const counts = [...list.querySelectorAll("tbody td:first-of-type")].map((td) =>
      Number(td.textContent),
    );
    expect(counts).toEqual([12, 6, 6, 6]);
    expect(list.querySelector("tbody td:nth-of-type(2)")!.textContent).toBe("40%");
  });

  test("marks animate between views, but not under reduced motion or above the limits", () => {
    const { container } = render(<Harness />);
    const css = container.querySelector(".dp-canvas > style")!.textContent!;
    expect(css).toMatch(/\.dp-mark\{transition:transform 700ms/);
    expect(css).toMatch(/@media \(prefers-reduced-motion:reduce\)\{[^}]*\{transition:none\}\}/);
    cleanup();
    const layout = placed("genre");
    const still = render(
      <MarkCanvas
        marks={layout.marks}
        legends={layout.legends}
        arrange="genre"
        viewBox={[0, 0, 600, 20]}
        title="Still"
        description=""
        motion={{ glide: 10, fade: 10 }}
      />,
    );
    const stillCss = still.container.querySelector(".dp-canvas > style")!.textContent!;
    expect(stillCss).not.toContain("transform 700ms");
    expect(stillCss).not.toContain("fill 600ms");
  });

  test("a view adds its own layers and classes", () => {
    const layout = placed("genre");
    const { container } = render(
      <MarkCanvas
        marks={layout.marks}
        legends={layout.legends}
        arrange="genre"
        viewBox={[0, 0, 600, 20]}
        title="Layered"
        description=""
        className="my-view"
        markClassName="my-mark"
        background={<rect className="guide" />}
        foreground={<text className="note">Note</text>}
      >
        <p className="after">After</p>
      </MarkCanvas>,
    );
    const svg = container.querySelector("svg")!;
    expect(container.querySelector(".dp-canvas.my-view")).not.toBeNull();
    expect(container.querySelectorAll(".dp-mark.my-mark")).toHaveLength(items.length);
    const children = [...svg.children].map((c) => c.getAttribute("class") ?? c.tagName);
    expect(children.indexOf("guide")).toBeLessThan(children.indexOf("dp-marks"));
    expect(children.indexOf("note")).toBeGreaterThan(children.indexOf("dp-marks"));
    expect(svg.nextElementSibling!.className).toBe("after");
  });
});
