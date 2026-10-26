import { encodeProfile } from "@data-profile/core";
import { FRAME, ridges } from "./ridges";
import { resolveForm } from "./form";
import { polylineLength, slotsAlong } from "./slots";
import type {
  FingerprintForm,
  FingerprintLayout,
  FingerprintNode,
  LayoutInput,
  Point,
} from "./types";

/** The id of the category unknown values fall into. Reserved: a dimension may not use it. */
export { UNKNOWN_CATEGORY_ID } from "@data-profile/core";

/**
 * Data the layout cannot draw truthfully: duplicate item ids, a weight that is not positive, a
 * reserved or duplicated category id, an encoding naming no dimension, or lightness on an unordered
 * dimension. `layoutFingerprint` throws it; `useFingerprint` returns it as `error`. Core's
 * `DataError`.
 */
export { DataError as FingerprintDataError } from "@data-profile/core";

/**
 * 600 marks: the most SVG glides smoothly between views (measured in Chrome: 56-59 fps at 400,
 * 43-50 at 800, 16-27 at 1,500), and large enough that a mark stays legible at phone width.
 */
const DEFAULTS = { seed: "fingerprint", maxMarks: 600, minRidges: 6 } as const;
/** A mark fills this share of the space between its neighbours. */
const MARK_FILL = 0.85;

/** A usable count, or undefined for anything else (undefined, NaN, zero, negative). */
const positive = (value: number | undefined) =>
  value !== undefined && Number.isFinite(value) && value >= 1 ? Math.floor(value) : undefined;

/**
 * Ridges depend only on the form and spacing, not on the active dimension, so switching lens
 * reuses them: the marks move, the ridges stay. A few recent results are kept; the layout stays a
 * pure function because equal inputs always gave equal ridges.
 */
const ridgeCache = new Map<string, Point[][]>();
function cachedRidges(form: FingerprintForm, spacing: number): Point[][] {
  const key = `${JSON.stringify(form)}:${spacing}`;
  const hit = ridgeCache.get(key);
  if (hit) return hit;
  const traced = ridges(form, spacing);
  ridgeCache.set(key, traced);
  if (ridgeCache.size > 8) ridgeCache.delete(ridgeCache.keys().next().value!);
  return traced;
}

/**
 * Lays the items out along fingerprint ridges.
 *
 * `encoding` says which dimension arranges the marks and which drive colour, shape and lightness
 * (see `FingerprintEncoding`); left out, the first dimension does all but lightness. Items are
 * sorted by the arranging dimension's category order, then by each other encoded dimension's,
 * then by id, and laid along the ridges from the core outwards, so categories form runs. Mark
 * **area** is proportional to weight; positions only arrange.
 *
 * A pure function of its input: the same items, dimensions, encoding and options give the same
 * layout whatever order the items arrive in and whatever size it is drawn at. The ridges come from
 * `form` (see `formFromItems`). The items array is treated as immutable: work is cached against it.
 *
 * Above `maxMarks` items, consecutive items that agree on **every** encoded dimension share a mark
 * (`itemsPerMark` > 1), so a mark never misrepresents any item in it. Nothing is sampled away.
 */
export function layoutFingerprint(input: LayoutInput): FingerprintLayout {
  const { items, dimensions, encoding } = input;
  // Read field by field: spreading the input would let an explicit `undefined` (which callers pass
  // through when they have no value) replace a default, and an undefined cap means one mark per item.
  const seed = input.seed ?? DEFAULTS.seed;
  const maxMarks = positive(input.maxMarks) ?? DEFAULTS.maxMarks;
  const minRidges = positive(input.minRidges) ?? DEFAULTS.minRidges;
  const form = resolveForm(seed, input.form);
  const { marks, ...profile } = encodeProfile({ items, dimensions, encoding, maxMarks });

  // Ridges are spaced so that, laid end to end, they hold every mark about one spacing apart. The
  // first trace estimates their length from the frame's area; one retrace corrects the spacing from
  // the length actually traced, since ridge endings and the outline make that hard to predict.
  const count = Math.max(1, marks.length);
  const widest = FRAME.rx / minRidges;
  let spacing = Math.min(widest, Math.sqrt((Math.PI * FRAME.rx * FRAME.ry * 0.85) / count));
  let lines = cachedRidges(form, spacing);
  if (marks.length > 0) {
    const traced = lines.reduce((sum, line) => sum + polylineLength(line), 0);
    const corrected = Math.min(widest, Math.sqrt((traced * spacing) / count));
    if (Math.abs(corrected - spacing) / spacing > 0.03) {
      spacing = corrected;
      lines = cachedRidges(form, spacing);
    }
  }
  const { slots, pitch } = slotsAlong(lines, marks.length);
  const footprint = Math.min(pitch, spacing) * MARK_FILL;

  const heaviest = Math.max(0, ...marks.map((mark) => mark.weight));
  const nodes: FingerprintNode[] = marks.map((mark, i) => {
    const slot = slots[i]!;
    return {
      ...mark,
      x: slot.x,
      y: slot.y,
      rotation: slot.rotation,
      size: footprint * Math.sqrt(mark.weight / heaviest),
    };
  });

  return {
    width: FRAME.width,
    height: FRAME.height,
    ...profile,
    nodes,
    ridges: lines,
    form,
    ridgeSpacing: spacing,
  };
}

/** A layout with nothing in it: what `useFingerprint` shows while its data is invalid. */
export function emptyLayout(): FingerprintLayout {
  return {
    width: FRAME.width,
    height: FRAME.height,
    encoding: { arrange: "", color: null, shape: null, lightness: null },
    nodes: [],
    ridges: [],
    form: resolveForm(DEFAULTS.seed),
    ridgeSpacing: FRAME.rx / DEFAULTS.minRidges,
    legends: [],
    warnings: [],
    itemsPerMark: 1,
    itemCount: 0,
  };
}
