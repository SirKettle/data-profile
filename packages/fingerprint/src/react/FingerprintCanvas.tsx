import {
  memo,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { CALLOUT_GUTTER, CALLOUT_HEIGHT, placeCallouts } from "../callouts";
import { ridgeOpacity } from "../opacity";
import type {
  FingerprintAnnotation,
  FingerprintLayout,
  FingerprintNode,
  RidgeStyle,
} from "../types";
import { shapesRenderer, type FingerprintRenderer } from "./renderers";

/** A category of one dimension: what a legend entry or a mark selects. */
export interface FingerprintSelection {
  /** The dimension the category belongs to. */
  dimensionId: string;
  /** The category's id, or `UNKNOWN_CATEGORY_ID`. */
  categoryId: string;
}

/** Props of `FingerprintCanvas`. `useFingerprint`'s `canvasProps` supplies most of them. */
export interface FingerprintCanvasProps {
  /** What to draw: from `useFingerprint` (`canvasProps`) or `layoutFingerprint`. */
  layout: FingerprintLayout;
  /** The drawing's accessible name. */
  title: string;
  /** What it shows, in words (`describeLayout` writes one). */
  description: string;
  /** Draws each mark. Defaults to `shapesRenderer`. */
  renderer?: FingerprintRenderer;
  /** How the ridges behind the marks are drawn. Defaults to `{ show: "auto" }`. */
  ridges?: RidgeStyle;
  /** Marks in this category of this dimension are highlighted, the rest dimmed. */
  selected?: FingerprintSelection | null;
  /**
   * Called when a mark is clicked, with its category in the arranging dimension, or null when that
   * is already the selection.
   */
  onSelect?: (selection: FingerprintSelection | null) => void;
  /** Notes pinned to the print, each with a leader to a mark of the categories it names. */
  annotations?: readonly FingerprintAnnotation[];
  /** Where the annotations go. See `FingerprintCallouts`. */
  callouts?: FingerprintCallouts;
  /** Names what one item is, for the selection announcement. Defaults to "items". */
  unit?: string;
  /** How marks move when the view changes. See `FingerprintMotion`. */
  motion?: FingerprintMotion;
  /** Extra class on the canvas's wrapper. */
  className?: string;
}

/** Where callouts go. */
export interface FingerprintCallouts {
  /** `auto` (the default) puts them beside the print when there is room and numbered below it when not. */
  placement?: "auto" | "beside" | "below";
  /** Below this container width, `auto` puts callouts below. Defaults to 640 px. */
  breakpoint?: number;
}

/**
 * How marks move when the view changes. SVG animates only so many marks smoothly, so above each
 * limit the change is instant instead of stuttering. Under `prefers-reduced-motion` nothing moves.
 */
export interface FingerprintMotion {
  /**
   * Marks glide to their new places while there are at most this many. Defaults to 800: about what
   * SVG animates smoothly enough (43-50 fps in Chrome); 1,500 gliding marks fell to 16-27 fps. It
   * sits above the default mark cap of 600 because a layout can exceed its cap slightly.
   */
  glide?: number;
  /**
   * Colours, fills and lightness fade while there are at most this many marks. Defaults to 400:
   * fades on top of a glide cost a third of the frame rate at 600 marks, and nothing at 400.
   */
  fade?: number;
}

/** Ridge directions are equivalent half a turn apart; keeping them in one half stops marks spinning between lenses. */
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
 * cost a 300 ms stall with 1,500 marks. Recomputed only when the layout changes; the state is
 * committed after render, so a discarded render cannot disturb it.
 */
function useCarriedMarks(layout: FingerprintLayout): { key: string; node: FingerprintNode }[] {
  const committed = useRef({ keyOf: new Map<string, string>(), order: [] as string[] });
  const pending = useRef(committed.current);
  const marks = useMemo(() => {
    const previous = committed.current;
    const keyOf = new Map<string, string>();
    const nodeOf = new Map<string, FingerprintNode>();
    layout.nodes.forEach((node, i) => {
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
  }, [layout]);
  useEffect(() => {
    committed.current = pending.current;
  }, [marks]);
  return marks;
}

/** The opacity of marks outside the selection. */
const DIMMED = 0.22;

/**
 * One mark. Memoised: it re-renders only when its node changes (a new view or new data), never for
 * a selection, a callout or a resize. Selection is drawn by the canvas's style rule, matching the
 * `data-d{n}` attributes each mark carries for every encoded dimension.
 */
const Mark = memo(function Mark({
  node,
  dimensions,
  arrange,
  renderer,
  idPrefix,
  onChoose,
}: {
  node: FingerprintNode;
  dimensions: readonly string[];
  arrange: string;
  renderer: FingerprintRenderer;
  idPrefix: string;
  onChoose?: (categoryId: string) => void;
}) {
  const attributes: Record<string, string> = {};
  dimensions.forEach((id, k) => (attributes[`data-d${k}`] = node.categories[id] ?? ""));
  return (
    <g
      className="fp-mark"
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
});

function useWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState<number | null>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element || typeof ResizeObserver !== "function") return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry?.contentRect.width ?? null));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

const visuallyHidden: CSSProperties = {
  position: "absolute",
  width: 1,
  height: 1,
  overflow: "hidden",
  clip: "rect(0 0 0 0)",
  whiteSpace: "nowrap",
};

/**
 * The fingerprint itself: ridges, one mark per laid-out node drawn by `renderer`, and optional
 * callouts. Marks move to their new places when the layout's view changes (instantly under reduced
 * motion), and marks outside a selection dim. Both are CSS: a selection re-renders no marks. The SVG is one image to assistive technology, named and described by `title` and
 * `description`; choosing a category is done from the legend or list, which are keyboard
 * reachable, and also by pointer on a mark.
 */
export function FingerprintCanvas({
  layout,
  title,
  description,
  renderer = shapesRenderer,
  ridges,
  selected = null,
  onSelect,
  annotations = [],
  callouts,
  unit = "items",
  motion,
  className,
}: FingerprintCanvasProps) {
  const uid = useId().replace(/[^\w-]/g, "");
  const [ref, width] = useWidth();
  const placed = useMemo(() => placeCallouts(layout, annotations), [layout, annotations]);
  const mode =
    placed.length === 0
      ? "none"
      : (callouts?.placement ?? "auto") === "auto"
        ? width !== null && width < (callouts?.breakpoint ?? 640)
          ? "below"
          : "beside"
        : callouts!.placement!;
  const gutter = mode === "beside" ? CALLOUT_GUTTER : 0;
  const opacity = ridgeOpacity(layout.itemCount, ridges);
  const selectedEntry = selected
    ? layout.legends
        .find((group) => group.dimensionId === selected.dimensionId)
        ?.entries.find((entry) => entry.id === selected.categoryId)
    : undefined;
  // One stable click handler for every mark, reading the latest props, so a new selection does not
  // hand 1,500 memoised marks a new function and re-render them all.
  const latest = useRef({ selected, onSelect, dimensionId: layout.encoding.arrange });
  latest.current = { selected, onSelect, dimensionId: layout.encoding.arrange };
  const choose = useCallback((categoryId: string) => {
    const { selected: current, onSelect: select, dimensionId } = latest.current;
    select?.(
      current?.dimensionId === dimensionId && current.categoryId === categoryId
        ? null
        : { dimensionId, categoryId },
    );
  }, []);
  const dimensions = useMemo(() => layout.legends.map((g) => g.dimensionId), [layout.legends]);
  const marks = useCarriedMarks(layout);
  // Motion, cursor and selection as one rule set: a selection rewrites this text, not every mark.
  const scope = `.fp-${uid} .fp-mark`;
  const selectedIndex = selected ? dimensions.indexOf(selected.dimensionId) : -1;
  const glides = layout.nodes.length <= (motion?.glide ?? 800);
  const fades = layout.nodes.length <= (motion?.fade ?? 400);
  const css = [
    `${scope}{transition:${glides ? "transform 700ms cubic-bezier(.2,.7,.2,1)," : ""}opacity 250ms ease${onSelect ? ";cursor:pointer" : ""}}`,
    fades ? `${scope}>*{transition:fill 600ms ease,fill-opacity 600ms ease,stroke 600ms ease}` : "",
    `@media (prefers-reduced-motion:reduce){${scope},${scope}>*{transition:none}}`,
    selected && selectedIndex >= 0
      ? `${scope}:not([data-d${selectedIndex}=${cssString(selected.categoryId)}]){opacity:${DIMMED}}`
      : "",
  ].join("\n");
  const ridgeLines = useMemo(
    () =>
      opacity > 0 ? (
        <g
          className="fp-ridges"
          fill="none"
          stroke={ridges?.color ?? "currentColor"}
          strokeOpacity={opacity}
          strokeWidth={layout.ridgeSpacing * (ridges?.width ?? 0.12)}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {layout.ridges.map((ridge, i) => (
            <polyline
              key={i}
              points={ridge.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ")}
            />
          ))}
        </g>
      ) : null,
    [opacity, ridges?.color, ridges?.width, layout.ridgeSpacing, layout.ridges],
  );

  return (
    <div
      ref={ref}
      className={["fp-canvas", `fp-${uid}`, className].filter(Boolean).join(" ")}
      style={{ position: "relative" }}
      data-selection={selected ? `${selected.dimensionId}:${selected.categoryId}` : undefined}
    >
      <style>{css}</style>
      <svg
        viewBox={`${-gutter} 0 ${layout.width + gutter * 2} ${layout.height}`}
        role="img"
        aria-labelledby={`${uid}-title ${uid}-desc`}
        style={{ display: "block", width: "100%", height: "auto", overflow: "visible" }}
      >
        <title id={`${uid}-title`}>{title}</title>
        <desc id={`${uid}-desc`}>{description}</desc>
        {renderer.defs && <defs>{renderer.defs({ idPrefix: uid, legends: layout.legends })}</defs>}
        {ridgeLines}
        <g className="fp-marks">
          {marks.map(({ key, node }) => (
            <Mark
              key={key}
              node={node}
              dimensions={dimensions}
              arrange={layout.encoding.arrange}
              renderer={renderer}
              idPrefix={uid}
              onChoose={onSelect ? choose : undefined}
            />
          ))}
        </g>
        {mode === "beside" &&
          placed.map((callout) => {
            const left = callout.side === "left";
            const edge = left ? -12 : layout.width + 12;
            return (
              <g key={callout.annotation.id} className="fp-callout" data-side={callout.side}>
                <polyline
                  className="fp-callout__leader"
                  points={`${edge},${callout.labelY + 14} ${left ? edge + 10 : edge - 10},${callout.labelY + 14} ${callout.anchor.x},${callout.anchor.y}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.2}
                />
                <circle cx={callout.anchor.x} cy={callout.anchor.y} r={3.5} fill="currentColor" />
                <foreignObject
                  x={left ? -gutter : layout.width + 16}
                  y={callout.labelY}
                  width={gutter - 16}
                  height={CALLOUT_HEIGHT}
                >
                  <div
                    className="fp-callout__label"
                    style={{ textAlign: left ? "right" : "left", fontSize: 13, lineHeight: 1.35 }}
                  >
                    <strong style={{ display: "block", fontSize: 15 }}>
                      {callout.annotation.title}
                    </strong>
                    {callout.annotation.body && <span>{callout.annotation.body}</span>}
                  </div>
                </foreignObject>
              </g>
            );
          })}
        {mode === "below" &&
          placed.map((callout) => (
            <g key={callout.annotation.id} className="fp-callout-marker" aria-hidden="true">
              <circle cx={callout.anchor.x} cy={callout.anchor.y} r={11} fill="currentColor" />
              <text
                x={callout.anchor.x}
                y={callout.anchor.y}
                dy="0.35em"
                textAnchor="middle"
                fontSize={13}
                fontWeight={700}
                style={{ fill: "var(--fp-callout-ink, Canvas)" }}
              >
                {callout.number}
              </text>
            </g>
          ))}
      </svg>
      {mode === "below" && (
        <ol className="fp-callouts">
          {placed.map((callout) => (
            <li key={callout.annotation.id} value={callout.number}>
              <strong>{callout.annotation.title}</strong>
              {callout.annotation.body && <> {callout.annotation.body}</>}
            </li>
          ))}
        </ol>
      )}
      {/* The callouts drawn beside the print are inside the image; their words are repeated here
          so a screen reader gets them too. */}
      {mode === "beside" && (
        <ul style={visuallyHidden}>
          {placed.map((callout) => (
            <li key={callout.annotation.id}>
              {callout.annotation.title}. {callout.annotation.body}
            </li>
          ))}
        </ul>
      )}
      <p role="status" aria-live="polite" style={visuallyHidden}>
        {selectedEntry
          ? `${selectedEntry.label}: ${selectedEntry.count.toLocaleString("en-GB")} ${unit}.`
          : ""}
      </p>
    </div>
  );
}
