import type { LegendGroup } from "@data-profile/core";
import {
  memo,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  type CSSProperties,
  type ReactNode,
  type Ref,
} from "react";
import { shapesRenderer } from "./renderers";
import type { PlacedMark, Renderer, Selection } from "./types";

/**
 * How marks move when the view changes. SVG animates only so many marks smoothly, so above each
 * limit the change is instant instead of stuttering. Under `prefers-reduced-motion` nothing moves.
 */
export interface Motion {
  /**
   * Marks glide to their new places while there are at most this many. Defaults to 800: about what
   * SVG animates smoothly enough (43-50 fps in Chrome); 1,500 gliding marks fell to 16-27 fps.
   */
  glide?: number;
  /**
   * Colours, fills and lightness fade while there are at most this many marks. Defaults to 400:
   * fades on top of a glide cost a third of the frame rate at 600 marks, and nothing at 400.
   */
  fade?: number;
}

/** Props of `MarkCanvas`. A view's canvas supplies `marks`, `legends`, `arrange` and `viewBox`. */
export interface MarkCanvasProps<M extends PlacedMark = PlacedMark> {
  /** The placed marks, from a view's layout. */
  marks: readonly M[];
  /** The layout's legends: which dimensions are encoded, and the selection's counts. */
  legends: readonly LegendGroup[];
  /** The arranging dimension's id: clicking a mark selects its category of this dimension. */
  arrange: string;
  /** `[x, y, width, height]` of the frame to show. */
  viewBox: readonly [x: number, y: number, width: number, height: number];
  /** The drawing's accessible name. */
  title: string;
  /** What it shows, in words (`describeProfile` writes one). */
  description: string;
  /** Draws each mark. Defaults to `shapesRenderer`. */
  renderer?: Renderer<M>;
  /** Marks in this category of this dimension are highlighted, the rest dimmed. */
  selected?: Selection | null;
  /**
   * Called when a mark is clicked, with its category in the arranging dimension, or null when that
   * is already the selection.
   */
  onSelect?: (selection: Selection | null) => void;
  /** Names what one item is, for the selection announcement. Defaults to "items". */
  unit?: string;
  /** How marks move when the view changes. See `Motion`. */
  motion?: Motion;
  /** Extra class on the wrapper. */
  className?: string;
  /** Extra class on every mark's group, beside `dp-mark`. */
  markClassName?: string;
  /** Drawn inside the SVG, under the marks: a view's guides. */
  background?: ReactNode;
  /** Drawn inside the SVG, over the marks: a view's annotations. */
  foreground?: ReactNode;
  /** Rendered after the SVG, inside the wrapper. */
  children?: ReactNode;
  /** The wrapper element, for a view that measures it. */
  containerRef?: Ref<HTMLDivElement>;
}

/** Directions half a turn apart are equivalent; keeping them in one half stops marks spinning between views. */
const halfTurn = (degrees: number) => ((((degrees + 90) % 180) + 180) % 180) - 90;

/** A CSS attribute-selector string literal for any category id. */
const cssString = (value: string) => `"${value.replace(/["\\]/g, "\\$&").replace(/\n/g, "\\a ")}"`;

/**
 * Which element draws each mark, and in what DOM order. A mark takes the key of a previous mark
 * that held one of its items, so a view change moves elements rather than replacing them:
 * single-item marks follow their item, and grouped marks (whose ids change with every view) glide
 * from where their items were. Marks with no counterpart get a fresh key and appear.
 *
 * Carried elements also keep their previous DOM order, with new ones after them. Marks never
 * overlap, so order does not show, but React moving hundreds of SVG elements to match a new order
 * cost a 300 ms stall with 1,500 marks. Recomputed only when the marks change; the state is
 * committed after render, so a discarded render cannot disturb it.
 */
function useCarriedMarks<M extends PlacedMark>(marks: readonly M[]): { key: string; node: M }[] {
  const committed = useRef({ keyOf: new Map<string, string>(), order: [] as string[] });
  const pending = useRef(committed.current);
  const carried = useMemo(() => {
    const previous = committed.current;
    const keyOf = new Map<string, string>();
    const nodeOf = new Map<string, M>();
    marks.forEach((node, i) => {
      let key: string | undefined;
      for (const id of node.itemIds) {
        const candidate = previous.keyOf.get(id);
        if (candidate !== undefined && !nodeOf.has(candidate)) {
          key = candidate;
          break;
        }
      }
      if (key === undefined) key = nodeOf.has(node.id) ? `${node.id}~${i}` : node.id;
      nodeOf.set(key, node);
      for (const id of node.itemIds) keyOf.set(id, key);
    });
    const kept = previous.order.filter((key) => nodeOf.has(key));
    const keptSet = new Set(kept);
    const order = [...kept, ...[...nodeOf.keys()].filter((key) => !keptSet.has(key))];
    pending.current = { keyOf, order };
    return order.map((key) => ({ key, node: nodeOf.get(key)! }));
  }, [marks]);
  useEffect(() => {
    committed.current = pending.current;
  }, [carried]);
  return carried;
}

/** The opacity of marks outside the selection. */
const DIMMED = 0.22;

/**
 * One mark. Memoised: it re-renders only when its node changes (a new view or new data), never for
 * a selection or a resize. Selection is drawn by the canvas's style rule, matching the `data-d{n}`
 * attributes each mark carries for every encoded dimension.
 */
const MarkShape = memo(function MarkShape<M extends PlacedMark>({
  node,
  dimensions,
  arrange,
  renderer,
  idPrefix,
  className,
  onChoose,
}: {
  node: M;
  dimensions: readonly string[];
  arrange: string;
  renderer: Renderer<M>;
  idPrefix: string;
  className: string;
  onChoose?: (categoryId: string) => void;
}) {
  const attributes: Record<string, string> = {};
  dimensions.forEach((id, k) => (attributes[`data-d${k}`] = node.categories[id] ?? ""));
  return (
    <g
      className={className}
      data-category={node.categories[arrange]}
      {...attributes}
      onClick={onChoose ? () => onChoose(node.categories[arrange]!) : undefined}
      style={{
        transform: `translate(${node.x}px, ${node.y}px) rotate(${halfTurn(node.rotation)}deg)`,
      }}
    >
      {renderer.mark({ node, idPrefix })}
    </g>
  );
}) as <M extends PlacedMark>(props: {
  node: M;
  dimensions: readonly string[];
  arrange: string;
  renderer: Renderer<M>;
  idPrefix: string;
  className: string;
  onChoose?: (categoryId: string) => void;
}) => ReactNode;

const visuallyHidden: CSSProperties = {
  position: "absolute",
  width: 1,
  height: 1,
  overflow: "hidden",
  clip: "rect(0 0 0 0)",
  whiteSpace: "nowrap",
};

/**
 * What every view's canvas shares: one mark per placed mark, drawn by `renderer`. Marks move to
 * their new places when the view changes (instantly under reduced motion), and marks outside a
 * selection dim. Both are CSS: a selection re-renders no marks. The SVG is one image to assistive
 * technology, named and described by `title` and `description`; choosing a category is done from a
 * `Legend` or `CategoryList`, which are keyboard reachable, and also by pointer on a mark. A live
 * region announces the selection.
 *
 * A view draws its own guides as `background` and its notes as `foreground`.
 */
export function MarkCanvas<M extends PlacedMark>({
  marks,
  legends,
  arrange,
  viewBox,
  title,
  description,
  renderer = shapesRenderer as Renderer<M>,
  selected = null,
  onSelect,
  unit = "items",
  motion,
  className,
  markClassName,
  background,
  foreground,
  children,
  containerRef,
}: MarkCanvasProps<M>) {
  const uid = useId().replace(/[^\w-]/g, "");
  const selectedEntry = selected
    ? legends
        .find((group) => group.dimensionId === selected.dimensionId)
        ?.entries.find((entry) => entry.id === selected.categoryId)
    : undefined;
  // One stable click handler for every mark, reading the latest props, so a new selection does not
  // hand 1,500 memoised marks a new function and re-render them all.
  const latest = useRef({ selected, onSelect, dimensionId: arrange });
  latest.current = { selected, onSelect, dimensionId: arrange };
  const choose = useCallback((categoryId: string) => {
    const { selected: current, onSelect: select, dimensionId } = latest.current;
    select?.(
      current?.dimensionId === dimensionId && current.categoryId === categoryId
        ? null
        : { dimensionId, categoryId },
    );
  }, []);
  const dimensions = useMemo(() => legends.map((g) => g.dimensionId), [legends]);
  const carried = useCarriedMarks(marks);
  // Motion, cursor and selection as one rule set: a selection rewrites this text, not every mark.
  const scope = `.dp-${uid} .dp-mark`;
  const selectedIndex = selected ? dimensions.indexOf(selected.dimensionId) : -1;
  const glides = marks.length <= (motion?.glide ?? 800);
  const fades = marks.length <= (motion?.fade ?? 400);
  const css = [
    `${scope}{transition:${glides ? "transform 700ms cubic-bezier(.2,.7,.2,1)," : ""}opacity 250ms ease${onSelect ? ";cursor:pointer" : ""}}`,
    fades ? `${scope}>*{transition:fill 600ms ease,fill-opacity 600ms ease,stroke 600ms ease}` : "",
    `@media (prefers-reduced-motion:reduce){${scope},${scope}>*{transition:none}}`,
    selected && selectedIndex >= 0
      ? `${scope}:not([data-d${selectedIndex}=${cssString(selected.categoryId)}]){opacity:${DIMMED}}`
      : "",
  ].join("\n");
  const markClass = ["dp-mark", markClassName].filter(Boolean).join(" ");

  return (
    <div
      ref={containerRef}
      className={["dp-canvas", `dp-${uid}`, className].filter(Boolean).join(" ")}
      style={{ position: "relative" }}
      data-selection={selected ? `${selected.dimensionId}:${selected.categoryId}` : undefined}
    >
      <style>{css}</style>
      <svg
        viewBox={viewBox.join(" ")}
        role="img"
        aria-labelledby={`${uid}-title ${uid}-desc`}
        style={{ display: "block", width: "100%", height: "auto", overflow: "visible" }}
      >
        <title id={`${uid}-title`}>{title}</title>
        <desc id={`${uid}-desc`}>{description}</desc>
        {renderer.defs && <defs>{renderer.defs({ idPrefix: uid, legends })}</defs>}
        {background}
        <g className="dp-marks">
          {carried.map(({ key, node }) => (
            <MarkShape
              key={key}
              node={node}
              dimensions={dimensions}
              arrange={arrange}
              renderer={renderer}
              idPrefix={uid}
              className={markClass}
              onChoose={onSelect ? choose : undefined}
            />
          ))}
        </g>
        {foreground}
      </svg>
      {children}
      <p role="status" aria-live="polite" style={visuallyHidden}>
        {selectedEntry
          ? `${selectedEntry.label}: ${selectedEntry.count.toLocaleString("en-GB")} ${unit}.`
          : ""}
      </p>
    </div>
  );
}
