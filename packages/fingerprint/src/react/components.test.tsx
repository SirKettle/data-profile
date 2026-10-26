import "./test-setup";
import { afterEach, describe, expect, test } from "bun:test";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { libraryDimensions, libraryItems } from "../fixtures";
import type { FingerprintAnnotation } from "../types";
import { FingerprintCanvas } from "./FingerprintCanvas";
import {
  FingerprintLegend,
  FingerprintList,
  FingerprintViewSwitch,
  type FingerprintView,
} from "./FingerprintControls";
import { dotsRenderer, shapesRenderer, type FingerprintRenderer } from "./renderers";
import { useFingerprint } from "./useFingerprint";

afterEach(cleanup);

const items = libraryItems(120);
const combined: FingerprintView = {
  id: "combined",
  label: "Combined",
  encoding: { arrange: "genre", color: "genre", shape: "state", lightness: "decade" },
};
const singles: FingerprintView[] = libraryDimensions.map((d) => ({
  id: d.id,
  label: d.label,
  encoding: { arrange: d.id },
}));

function Harness({
  renderer,
  annotations,
  callouts,
  views = singles,
}: {
  renderer?: FingerprintRenderer;
  annotations?: FingerprintAnnotation[];
  callouts?: "beside" | "below";
  views?: FingerprintView[];
}) {
  const fp = useFingerprint({ items, dimensions: libraryDimensions, views, unit: "books" });
  return (
    <>
      <FingerprintViewSwitch views={fp.views} value={fp.viewId} onChange={fp.setViewId} />
      <FingerprintCanvas
        {...fp.canvasProps}
        title="Library fingerprint"
        renderer={renderer}
        annotations={annotations}
        callouts={callouts ? { placement: callouts } : undefined}
      />
      {fp.layout.legends.map((group) => (
        <FingerprintLegend key={group.dimensionId} {...fp.legendProps(group)} renderer={renderer} />
      ))}
      {fp.layout.legends.map((group) => (
        <FingerprintList key={group.dimensionId} {...fp.listProps(group)} />
      ))}
    </>
  );
}

const marks = (container: HTMLElement) => [...container.querySelectorAll<SVGGElement>(".fp-mark")];
/**
 * What the canvas's selection rule does: the marks it leaves at full strength (selected) and those
 * it dims. Read from the generated rule, so these tests check the selection the browser applies.
 */
function selection(container: HTMLElement) {
  const css = container.querySelector(".fp-canvas > style")!.textContent!;
  const rule = css.match(/:not\(\[data-d(\d+)="((?:[^"\\]|\\.)*)"\]\)\{opacity:/);
  if (!rule) return null;
  const value = rule[2]!.replace(/\\(.)/g, "$1");
  const all = marks(container);
  const selected = all.filter((g) => g.getAttribute(`data-d${rule[1]}`) === value);
  return { selected, dimmed: all.length - selected.length };
}

const transforms = (container: HTMLElement) =>
  marks(container).map((g) => `${g.dataset.category}|${g.style.transform}`);

describe("fingerprint components", () => {
  test("one mark per item, named and described as one image", () => {
    const { container } = render(<Harness />);
    expect(marks(container)).toHaveLength(items.length);
    const svg = container.querySelector("svg[role=img]")!;
    expect(svg.querySelector("title")!.textContent).toBe("Library fingerprint");
    expect(svg.querySelector("desc")!.textContent).toStartWith("120 books by genre: ");
  });

  test("swapping the renderer changes the drawing, never positions or categories", () => {
    const a = render(<Harness renderer={shapesRenderer} />);
    const shaped = transforms(a.container);
    const shapes = a.container.querySelectorAll(".fp-mark rect, .fp-mark polygon").length;
    cleanup();
    const b = render(<Harness renderer={dotsRenderer} />);
    expect(transforms(b.container)).toEqual(shaped);
    expect(shapes).toBeGreaterThan(0);
    expect(b.container.querySelectorAll(".fp-mark rect, .fp-mark polygon")).toHaveLength(0);
  });

  test("choosing a category in the legend selects its marks and dims the rest; choosing it again clears", () => {
    const { container } = render(<Harness />);
    const toggle = container.querySelector<HTMLButtonElement>(".fp-legend__toggle")!;
    act(() => toggle.click());
    expect(toggle.getAttribute("aria-pressed")).toBe("true");
    const chosen = selection(container)!;
    expect(chosen.selected.length).toBeGreaterThan(0);
    expect(chosen.dimmed).toBeGreaterThan(0);
    expect(chosen.selected.every((g) => g.dataset.category === "fiction")).toBe(true);
    expect(container.querySelector("[role=status]")!.textContent).toMatch(/^Fiction: \d+ books\.$/);
    act(() => toggle.click());
    expect(selection(container)).toBeNull();
  });

  test("clicking a mark selects its category", () => {
    const { container } = render(<Harness />);
    const mark = marks(container).at(-1)!;
    fireEvent.click(mark);
    expect(selection(container)!.selected).toContain(mark);
  });

  test("changing lens keeps every mark, moves them, and clears the selection", () => {
    const { container } = render(<Harness />);
    const before = transforms(container);
    act(() => container.querySelector<HTMLButtonElement>(".fp-legend__toggle")!.click());
    const lens = [...container.querySelectorAll<HTMLButtonElement>(".fp-views__view")][1]!;
    act(() => lens.click());
    expect(lens.getAttribute("aria-pressed")).toBe("true");
    expect(marks(container)).toHaveLength(items.length);
    expect(transforms(container)).not.toEqual(before);
    expect(selection(container)).toBeNull();
    expect(container.querySelector("caption")!.textContent).toBe("Published: 120 books");
  });

  test("marks animate between views, and do not under reduced motion", () => {
    const { container } = render(<Harness />);
    const css = container.querySelector(".fp-canvas > style")!.textContent!;
    expect(css).toMatch(/\.fp-mark\{transition:transform 700ms/);
    expect(css).toMatch(/@media \(prefers-reduced-motion:reduce\)\{[^}]*\{transition:none\}\}/);
  });

  test("selecting re-renders no marks: dimming is one style rule", () => {
    let drawn = 0;
    const counting: FingerprintRenderer = {
      name: "counting",
      mark: (props) => {
        drawn += 1;
        return shapesRenderer.mark(props);
      },
    };
    const { container } = render(<Harness renderer={counting} />);
    const legendSwatches = container.querySelectorAll(".fp-legend__swatch").length;
    drawn = 0;
    act(() => container.querySelector<HTMLButtonElement>(".fp-legend__toggle")!.click());
    // Only the legend's own swatches redraw (they show which entry is pressed); no mark does.
    expect(drawn).toBeLessThanOrEqual(legendSwatches);
    expect(selection(container)!.selected.length).toBeGreaterThan(0);
  });

  test("the list gives exact counts that add up to the total", () => {
    const { container } = render(<Harness />);
    const counts = [...container.querySelectorAll("tbody tr td:first-of-type")].map((td) =>
      Number(td.textContent!.replace(/,/g, "")),
    );
    expect(counts.reduce((sum, n) => sum + n, 0)).toBe(items.length);
  });

  const annotations: FingerprintAnnotation[] = [
    { id: "lead", categoryIds: ["fiction"], title: "Fiction leads", body: "The largest genre." },
    { id: "art", categoryIds: ["art"], title: "Some art" },
  ];

  test("callouts beside the print draw leaders and repeat their words for screen readers", () => {
    const { container } = render(<Harness annotations={annotations} callouts="beside" />);
    expect(container.querySelectorAll(".fp-callout")).toHaveLength(2);
    expect(container.querySelector("svg[role=img]")!.getAttribute("viewBox")).toBe(
      "-190 0 780 520",
    );
    expect(container.textContent).toContain("Fiction leads. The largest genre.");
  });

  test("callouts below the print are numbered on the print and listed under it", () => {
    const { container } = render(<Harness annotations={annotations} callouts="below" />);
    expect(container.querySelector("svg[role=img]")!.getAttribute("viewBox")).toBe("0 0 400 520");
    expect(container.querySelectorAll(".fp-callout-marker")).toHaveLength(2);
    const listed = [...container.querySelectorAll(".fp-callouts li")].map((li) => li.textContent);
    expect(listed).toHaveLength(2);
    expect(listed.some((text) => text?.includes("Fiction leads"))).toBe(true);
    expect(listed.some((text) => text?.includes("Some art"))).toBe(true);
  });

  test("the combined view: colour, shape and lightness each show their own dimension, with a legend each", () => {
    const { container } = render(<Harness views={[combined, ...singles]} />);
    expect(marks(container)).toHaveLength(items.length);
    expect(
      [...container.querySelectorAll(".fp-legend__heading")].map((h) => h.textContent),
    ).toEqual(["Genre", "Reading state", "Published"]);
    // Three shapes for three reading states, and opacity varying with the decade.
    const kinds = new Set(
      marks(container).map(
        (g) =>
          g.firstElementChild!.tagName.toLowerCase() +
          (g.firstElementChild!.getAttribute("points")?.split(" ").length ?? ""),
      ),
    );
    expect(kinds.size).toBeGreaterThanOrEqual(3);
    const opacities = new Set(
      marks(container).map((g) => g.firstElementChild!.getAttribute("fill-opacity")),
    );
    expect(opacities.size).toBeGreaterThan(3);
    expect(container.querySelector("desc")!.textContent).toContain(
      "Colour shows genre, shape shows reading state, lightness shows published (fainter is earlier).",
    );
  });

  test("choosing a category in a legend other than colour selects marks across every colour", () => {
    const { container } = render(<Harness views={[combined]} />);
    const stateLegend = [...container.querySelectorAll(".fp-legend")][1]!;
    act(() => stateLegend.querySelector<HTMLButtonElement>(".fp-legend__toggle")!.click());
    const { selected } = selection(container)!;
    const read = items.filter((item) => item.values.state === "read").length;
    expect(selected).toHaveLength(read);
    expect(new Set(selected.map((g) => g.dataset.category)).size).toBeGreaterThan(1);
  });

  test("a very large collection still draws a capped number of marks through the hook", () => {
    function Big() {
      const fp = useFingerprint({
        items: libraryItems(30000),
        dimensions: libraryDimensions,
        views: [combined],
      });
      return <FingerprintCanvas layout={fp.layout} title="Big" description={fp.description} />;
    }
    const { container } = render(<Big />);
    expect(marks(container).length).toBeLessThan(700);
    expect(container.querySelector("desc")!.textContent).toContain(
      "Each mark stands for up to 50 items.",
    );
  });

  test("grouped marks keep their elements across a view change, so they glide rather than pop", () => {
    function Grouped() {
      const fp = useFingerprint({
        items,
        dimensions: libraryDimensions,
        views: singles,
        maxMarks: 40,
      });
      return (
        <>
          <FingerprintViewSwitch views={fp.views} value={fp.viewId} onChange={fp.setViewId} />
          <FingerprintCanvas layout={fp.layout} title="Grouped" description={fp.description} />
        </>
      );
    }
    const { container } = render(<Grouped />);
    const before = new Set(marks(container));
    const positions = new Map(marks(container).map((g) => [g, g.style.transform]));
    expect(container.querySelector("desc")!.textContent).toContain("Each mark stands for up to 3");
    act(() => [...container.querySelectorAll<HTMLButtonElement>(".fp-views__view")][1]!.click());
    const after = marks(container);
    const kept = after.filter((g) => before.has(g));
    // Most elements carry over (a few groups have no counterpart), and carried ones moved.
    expect(kept.length / after.length).toBeGreaterThan(0.8);
    expect(kept.filter((g) => positions.get(g) !== g.style.transform).length).toBeGreaterThan(
      kept.length / 2,
    );
    // Carried elements keep their DOM order: React moving them was the expensive part.
    const order = [...before];
    const places = kept.map((g) => order.indexOf(g));
    expect(places).toEqual([...places].sort((x, y) => x - y));
  });

  test("single-item marks follow their own item between views", () => {
    const labelled: FingerprintRenderer = {
      name: "labelled",
      mark: ({ node }) => <circle r={node.size / 2} data-item={node.itemIds[0]} />,
    };
    const { container } = render(<Harness renderer={labelled} />);
    const itemOf = new Map(
      marks(container).map((g) => [g, g.firstElementChild!.getAttribute("data-item")]),
    );
    act(() => [...container.querySelectorAll<HTMLButtonElement>(".fp-views__view")][1]!.click());
    const after = marks(container);
    expect(after.every((g) => itemOf.has(g))).toBe(true);
    expect(
      after.every((g) => itemOf.get(g) === g.firstElementChild!.getAttribute("data-item")),
    ).toBe(true);
  });

  test("marks glide and colours fade only up to their limits; above them they change at once", () => {
    function Limited(motion: { glide: number; fade: number }) {
      const fp = useFingerprint({ items, dimensions: libraryDimensions, views: singles });
      return (
        <FingerprintCanvas
          layout={fp.layout}
          title="Limited"
          description={fp.description}
          motion={motion}
        />
      );
    }
    const cssFor = (motion: { glide: number; fade: number }) => {
      const { container } = render(<Limited {...motion} />);
      const css = container.querySelector(".fp-canvas > style")!.textContent!;
      cleanup();
      return css;
    };
    const both = cssFor({ glide: 800, fade: 400 });
    expect(both).toContain("transform 700ms");
    expect(both).toContain("fill 600ms");
    const glideOnly = cssFor({ glide: 800, fade: 100 });
    expect(glideOnly).toContain("transform 700ms");
    expect(glideOnly).not.toContain("fill 600ms");
    const neither = cssFor({ glide: 100, fade: 100 });
    expect(neither).not.toContain("transform 700ms");
    expect(neither).not.toContain("fill 600ms");
    expect(neither).toContain("opacity 250ms");
  });

  test("invalid data comes back as an error with an empty layout, not a thrown render", () => {
    function Broken() {
      const fp = useFingerprint({
        items: [
          { id: "same", values: {} },
          { id: "same", values: {} },
        ],
        dimensions: libraryDimensions,
      });
      return (
        <>
          <output>{fp.error?.message}</output>
          <FingerprintCanvas {...fp.canvasProps} title="Broken" />
        </>
      );
    }
    const { container } = render(<Broken />);
    expect(container.querySelector("output")!.textContent).toBe('Duplicate item id "same"');
    expect(marks(container)).toHaveLength(0);
    expect(container.querySelector("desc")!.textContent).toBe('Duplicate item id "same"');
  });

  test("a list's shares are of its own group's total", () => {
    const { container } = render(<Harness />);
    const shares = [...container.querySelectorAll(".fp-list")][0]!.querySelectorAll(
      "tbody td:nth-of-type(2)",
    );
    const sum = [...shares].reduce(
      (total, td) => total + Number(td.textContent!.replace("%", "")),
      0,
    );
    expect(Math.abs(sum - 100)).toBeLessThanOrEqual(shares.length);
  });
});
