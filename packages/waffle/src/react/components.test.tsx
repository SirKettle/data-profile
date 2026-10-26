import "./test-setup";
import { afterEach, describe, expect, test } from "bun:test";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { libraryDimensions, libraryItems } from "../fixtures";
import { CategoryList, Legend, ViewSwitch, WaffleCanvas, useWaffle } from "./index";

afterEach(cleanup);

const items = libraryItems(100);

function Harness({ columns }: { columns?: number }) {
  const waffle = useWaffle({ items, dimensions: libraryDimensions, columns, unit: "books" });
  return (
    <>
      <ViewSwitch views={waffle.views} value={waffle.viewId} onChange={waffle.setViewId} />
      <WaffleCanvas {...waffle.canvasProps} title="Library waffle" />
      {waffle.layout.legends.map((group) => (
        <Legend key={group.dimensionId} {...waffle.legendProps(group)} />
      ))}
      {waffle.layout.legends.map((group) => (
        <CategoryList key={group.dimensionId} {...waffle.listProps(group)} />
      ))}
    </>
  );
}

const cells = (container: HTMLElement) => [
  ...container.querySelectorAll<SVGGElement>(".dp-waffle .dp-mark"),
];

describe("waffle components", () => {
  test("one cell per item, in the grid, named and described as one image", () => {
    const { container } = render(<Harness columns={10} />);
    expect(cells(container)).toHaveLength(100);
    expect(cells(container)[11]!.style.transform).toBe("translate(60px, 60px) rotate(0deg)");
    const svg = container.querySelector("svg[role=img]")!;
    expect(svg.getAttribute("viewBox")).toBe("0 0 400 400");
    expect(svg.querySelector("title")!.textContent).toBe("Library waffle");
    expect(svg.querySelector("desc")!.textContent).toStartWith("100 books by genre: ");
  });

  test("a legend toggle selects a category's cells and announces their count", () => {
    const { container } = render(<Harness />);
    act(() => container.querySelector<HTMLButtonElement>(".dp-legend__toggle")!.click());
    const css = container.querySelector(".dp-waffle > style")!.textContent!;
    expect(css).toMatch(/:not\(\[data-d\d+="fiction"\]\)\{opacity:/);
    expect(container.querySelector("[role=status]")!.textContent).toMatch(/^Fiction: \d+ books\.$/);
  });

  test("clicking a cell selects its category; switching view keeps every cell and clears it", () => {
    const { container } = render(<Harness />);
    fireEvent.click(cells(container)[0]!);
    expect(container.querySelector(".dp-waffle")!.getAttribute("data-selection")).toBe(
      "genre:fiction",
    );
    const before = new Set(cells(container));
    act(() => container.querySelectorAll<HTMLButtonElement>(".dp-views__view")[1]!.click());
    expect(cells(container).every((g) => before.has(g))).toBe(true);
    expect(container.querySelector(".dp-waffle")!.hasAttribute("data-selection")).toBe(false);
    expect(container.querySelector("caption")!.textContent).toBe("Published: 100 books");
  });

  test("invalid data comes back as an error with an empty waffle, not a thrown render", () => {
    function Broken() {
      const waffle = useWaffle({
        items: [
          { id: "same", values: {} },
          { id: "same", values: {} },
        ],
        dimensions: libraryDimensions,
      });
      return <WaffleCanvas {...waffle.canvasProps} title="Broken" />;
    }
    const { container } = render(<Broken />);
    expect(cells(container)).toHaveLength(0);
    expect(container.querySelector("desc")!.textContent).toBe('Duplicate item id "same"');
  });
});
