import { MarkCanvas, type Motion, type Selection } from "@data-profile/react";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { CALLOUT_GUTTER, CALLOUT_HEIGHT, placeCallouts } from "../callouts";
import { ridgeOpacity } from "../opacity";
import type { FingerprintAnnotation, FingerprintLayout, RidgeStyle } from "../types";
import type { FingerprintRenderer } from "./renderers";

/** A category of one dimension: what a legend entry or a mark selects. `@data-profile/react`'s `Selection`. */
export type FingerprintSelection = Selection;

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
 * How marks move when the view changes: `@data-profile/react`'s `Motion`. Marks glide while there
 * are at most `glide` of them (default 800, above the default mark cap of 600 because a layout can
 * exceed its cap slightly), and colours fade while there are at most `fade` (default 400).
 */
export type FingerprintMotion = Motion;

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
 * callouts. It is `@data-profile/react`'s `MarkCanvas` with the ridges under the marks and the
 * callouts over them, so marks glide between views (instantly under reduced motion), marks outside
 * a selection dim, and the SVG is one image named and described by `title` and `description`.
 * Choosing a category is done from the legend or list, which are keyboard reachable, and also by
 * pointer on a mark.
 */
export function FingerprintCanvas({
  layout,
  title,
  description,
  renderer,
  ridges,
  selected = null,
  onSelect,
  annotations = [],
  callouts,
  unit = "items",
  motion,
  className,
}: FingerprintCanvasProps) {
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

  const notes =
    mode === "beside"
      ? placed.map((callout) => {
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
        })
      : mode === "below"
        ? placed.map((callout) => (
            <g key={callout.annotation.id} className="fp-callout-marker" aria-hidden="true">
              <circle cx={callout.anchor.x} cy={callout.anchor.y} r={11} fill="currentColor" />
              <text
                x={callout.anchor.x}
                y={callout.anchor.y}
                dy="0.35em"
                textAnchor="middle"
                fontSize={13}
                fontWeight={700}
                style={{ fill: "var(--dp-callout-ink, Canvas)" }}
              >
                {callout.number}
              </text>
            </g>
          ))
        : null;

  return (
    <MarkCanvas
      marks={layout.nodes}
      legends={layout.legends}
      arrange={layout.encoding.arrange}
      viewBox={[-gutter, 0, layout.width + gutter * 2, layout.height]}
      title={title}
      description={description}
      renderer={renderer}
      selected={selected}
      onSelect={onSelect}
      unit={unit}
      motion={motion}
      className={["fp-canvas", className].filter(Boolean).join(" ")}
      markClassName="fp-mark"
      background={ridgeLines}
      foreground={notes}
      containerRef={ref}
    >
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
    </MarkCanvas>
  );
}
