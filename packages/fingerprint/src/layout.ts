import { compareIds } from "./hash";
import { DEFAULT_PALETTE, UNKNOWN_COLOR } from "./palette";
import { FRAME, ridges } from "./ridges";
import { resolveForm } from "./form";
import { polylineLength, slotsAlong } from "./slots";
import type {
  FingerprintChannel,
  FingerprintDimension,
  FingerprintEncoding,
  FingerprintItem,
  FingerprintLayout,
  FingerprintLegendEntry,
  FingerprintLegendGroup,
  FingerprintNode,
  FingerprintForm,
  LayoutInput,
  Point,
} from "./types";

/** The id of the category unknown values fall into. Reserved: a dimension may not use it. */
export const UNKNOWN_CATEGORY_ID = "~unknown";

/**
 * 600 marks: the most SVG glides smoothly between views (measured in Chrome: 56-59 fps at 400,
 * 43-50 at 800, 16-27 at 1,500), and large enough that a mark stays legible at phone width.
 */
const DEFAULTS = { seed: "fingerprint", maxMarks: 600, minRidges: 6 } as const;
/** A mark fills this share of the space between its neighbours. */
const MARK_FILL = 0.85;

/**
 * Data the layout cannot draw truthfully: duplicate item ids, a weight that is not positive, a
 * reserved or duplicated category id, an encoding naming no dimension, or lightness on an unordered
 * dimension. `layoutFingerprint` throws it; `useFingerprint` returns it as `error`.
 */
export class FingerprintDataError extends Error {
  override name = "FingerprintDataError";
}

/** A usable count, or undefined for anything else (undefined, NaN, zero, negative). */
const positive = (value: number | undefined) =>
  value !== undefined && Number.isFinite(value) && value >= 1 ? Math.floor(value) : undefined;

/** Beyond these, a property stops telling categories apart: palette colours repeat, and the default renderer has five shapes. */
const DISTINCT = { color: 10, shape: 5 } as const;

/** What a layout needs of an items array whatever the view: validated once, then reused. */
interface PreparedItems {
  /** `idRank[i]` is item i's place in id order: the stable tie-break. */
  idRank: Uint32Array;
  /** Each dimension's category rank per item; unknown ranks after every category. */
  ranks: WeakMap<FingerprintDimension, Int32Array>;
}

/**
 * Items arrays are treated as immutable: switching view lays out the same array again, so its
 * validation, id order and per-dimension ranks are worked out once and kept with it. This is what
 * keeps a view change fast for a very large collection; only a sort of numbers remains.
 */
const prepared = new WeakMap<readonly FingerprintItem[], PreparedItems>();
function prepare(items: readonly FingerprintItem[]): PreparedItems {
  const hit = prepared.get(items);
  if (hit) return hit;
  const seen = new Set<string>();
  for (const item of items) {
    if (seen.has(item.id)) throw new FingerprintDataError(`Duplicate item id "${item.id}"`);
    seen.add(item.id);
    const weight = item.weight ?? 1;
    if (!Number.isFinite(weight) || weight <= 0)
      throw new FingerprintDataError(
        `Item "${item.id}" has weight ${weight}; weights must be positive`,
      );
  }
  const byId = Uint32Array.from(items.keys()).sort((a, b) =>
    compareIds(items[a]!.id, items[b]!.id),
  );
  const idRank = new Uint32Array(items.length);
  byId.forEach((index, rank) => (idRank[index] = rank));
  const result = { idRank, ranks: new WeakMap<FingerprintDimension, Int32Array>() };
  prepared.set(items, result);
  return result;
}

function ranksIn(items: readonly FingerprintItem[], ready: PreparedItems, d: FingerprintDimension) {
  const hit = ready.ranks.get(d);
  if (hit) return hit;
  const index = new Map(d.categories.map((c, i) => [c.id, i]));
  const unknown = d.categories.length;
  const ranks = new Int32Array(items.length);
  items.forEach((item, i) => {
    const value = item.values[d.id];
    ranks[i] = (value != null ? index.get(value) : undefined) ?? unknown;
  });
  ready.ranks.set(d, ranks);
  return ranks;
}

function validateDimension(dimension: FingerprintDimension) {
  const categories = new Set<string>();
  for (const category of dimension.categories) {
    if (category.id === UNKNOWN_CATEGORY_ID)
      throw new FingerprintDataError(`Category id "${UNKNOWN_CATEGORY_ID}" is reserved`);
    if (categories.has(category.id))
      throw new FingerprintDataError(`Duplicate category id "${category.id}" in "${dimension.id}"`);
    categories.add(category.id);
  }
}

/** Fills in an encoding's defaults: colour and shape follow `arrange` unless set, lightness is off. */
function resolveEncoding(
  dimensions: readonly FingerprintDimension[],
  encoding: FingerprintEncoding | undefined,
): Required<FingerprintEncoding> {
  const arrange = encoding?.arrange ?? dimensions[0]?.id;
  if (arrange === undefined) throw new FingerprintDataError("At least one dimension is needed");
  const resolved = {
    arrange,
    color: encoding?.color === undefined ? arrange : encoding.color,
    shape: encoding?.shape === undefined ? arrange : encoding.shape,
    lightness: encoding?.lightness ?? null,
  };
  for (const [channel, id] of Object.entries(resolved)) {
    if (id === null) continue;
    const dimension = dimensions.find((d) => d.id === id);
    if (!dimension)
      throw new FingerprintDataError(
        `The ${channel} encoding names "${id}", which is not a dimension`,
      );
    if (channel === "lightness" && !dimension.ordered)
      throw new FingerprintDataError(
        `"${id}" drives lightness but is not ordered; lighter and darker would read as less and more`,
      );
  }
  return resolved;
}

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
  const ready = prepare(items);
  const encoded = resolveEncoding(dimensions, encoding);
  const byId = new Map(dimensions.map((d) => [d.id, d]));
  // Every dimension the encoding uses, once, in legend order: colour, shape, lightness, arrange.
  const used = [...new Set([encoded.color, encoded.shape, encoded.lightness, encoded.arrange])]
    .filter((id): id is string => id !== null)
    .map((id) => byId.get(id)!);
  used.forEach(validateDimension);
  // Sort priority: arrangement first, then the other properties, so a run splits into sub-runs.
  const priority = [...new Set([encoded.arrange, encoded.color, encoded.shape, encoded.lightness])]
    .filter((id): id is string => id !== null)
    .map((id) => byId.get(id)!);

  const ranks = new Map(used.map((d) => [d.id, ranksIn(items, ready, d)]));
  const categoryAt = (d: FingerprintDimension, rank: number) =>
    d.categories[rank]?.id ?? UNKNOWN_CATEGORY_ID;

  const groups: FingerprintLegendGroup[] = used.map((d) => {
    const channels = (["color", "shape", "lightness", "arrange"] as const).filter(
      (c) => encoded[c] === d.id,
    );
    const drives = (c: FingerprintChannel) => channels.includes(c);
    const entry = (
      id: string,
      label: string,
      i: number | null,
      color?: string,
      href?: string,
    ): FingerprintLegendEntry => ({
      id,
      label,
      color: drives("color")
        ? i === null
          ? UNKNOWN_COLOR
          : (color ?? DEFAULT_PALETTE[i % DEFAULT_PALETTE.length]!)
        : "currentColor",
      shape: drives("shape") ? i : 0,
      lightness:
        drives("lightness") && i !== null
          ? d.categories.length > 1
            ? i / (d.categories.length - 1)
            : 1
          : null,
      href,
      unknown: i === null,
      count: 0,
      weight: 0,
    });
    return {
      dimensionId: d.id,
      label: d.label,
      channels,
      entries: [
        ...d.categories.map((c, i) => entry(c.id, c.label, i, c.color, c.href)),
        entry(UNKNOWN_CATEGORY_ID, d.unknownLabel ?? "Unknown", null),
      ],
    };
  });
  const groupOf = new Map(groups.map((g) => [g.dimensionId, g]));
  const entryOf = (dimensionId: string, categoryId: string) => {
    const d = byId.get(dimensionId)!;
    const rank = d.categories.findIndex((c) => c.id === categoryId);
    return groupOf.get(dimensionId)!.entries[rank === -1 ? d.categories.length : rank]!;
  };

  // Counts, per dimension, straight from the rank arrays.
  for (const d of used) {
    const entries = groupOf.get(d.id)!.entries;
    const r = ranks.get(d.id)!;
    for (let i = 0; i < items.length; i++) {
      const entry = entries[r[i]!]!;
      entry.count += 1;
      entry.weight += items[i]!.weight ?? 1;
    }
  }

  // Sort by the encoded categories in priority order, packed into one number per item as a
  // mixed-radix key, then by id rank. Comparing numbers in typed arrays is what keeps a view change
  // fast; comparing strings and objects took most of a second at 100,000 items in a browser.
  const n = items.length;
  const comboKeys = new Float64Array(n);
  const priorityRanks = priority.map((d) => ranks.get(d.id)!);
  const radix = priority.map((d) => d.categories.length + 1);
  for (let i = 0; i < n; i++) {
    let key = 0;
    for (let k = 0; k < priority.length; k++) key = key * radix[k]! + priorityRanks[k]![i]!;
    comboKeys[i] = key;
  }
  const order = Uint32Array.from(items.keys()).sort(
    (a, b) => comboKeys[a]! - comboKeys[b]! || ready.idRank[a]! - ready.idRank[b]!,
  );

  // Group consecutive items that agree on every encoded dimension into marks of at most `itemsPerMark`.
  const itemsPerMark = Math.max(1, Math.ceil(n / maxMarks));
  const marksOf: { key: string; categories: Record<string, string>; members: FingerprintItem[] }[] =
    [];
  for (let k = 0; k < n; k++) {
    const item = items[order[k]!]!;
    const last = marksOf.at(-1);
    if (
      last &&
      comboKeys[order[k]!] === comboKeys[order[k - 1]!] &&
      last.members.length < itemsPerMark
    ) {
      last.members.push(item);
      continue;
    }
    const categories = Object.fromEntries(
      used.map((d) => [d.id, categoryAt(d, ranks.get(d.id)![order[k]!]!)]),
    );
    marksOf.push({ key: used.map((d) => categories[d.id]).join("|"), categories, members: [item] });
  }

  // Ridges are spaced so that, laid end to end, they hold every mark about one spacing apart. The
  // first trace estimates their length from the frame's area; one retrace corrects the spacing from
  // the length actually traced, since ridge endings and the outline make that hard to predict.
  const marks = Math.max(1, marksOf.length);
  const widest = FRAME.rx / minRidges;
  let spacing = Math.min(widest, Math.sqrt((Math.PI * FRAME.rx * FRAME.ry * 0.85) / marks));
  let lines = cachedRidges(form, spacing);
  if (marksOf.length > 0) {
    const traced = lines.reduce((sum, line) => sum + polylineLength(line), 0);
    const corrected = Math.min(widest, Math.sqrt((traced * spacing) / marks));
    if (Math.abs(corrected - spacing) / spacing > 0.03) {
      spacing = corrected;
      lines = cachedRidges(form, spacing);
    }
  }
  const { slots, pitch } = slotsAlong(lines, marksOf.length);
  const footprint = Math.min(pitch, spacing) * MARK_FILL;

  const weights = marksOf.map((mark) =>
    mark.members.reduce((sum, item) => sum + (item.weight ?? 1), 0),
  );
  const heaviest = Math.max(0, ...weights);
  const perKey = new Map<string, number>();
  const nodes: FingerprintNode[] = marksOf.map((mark, i) => {
    const n = perKey.get(mark.key) ?? 0;
    perKey.set(mark.key, n + 1);
    const slot = slots[i]!;
    const property = (channel: "color" | "shape" | "lightness") => {
      const id = encoded[channel];
      return id === null ? null : entryOf(id, mark.categories[id]!);
    };
    return {
      id: itemsPerMark === 1 ? mark.members[0]!.id : `${mark.key}#${n}`,
      itemIds: mark.members.map((item) => item.id),
      categories: mark.categories,
      x: slot.x,
      y: slot.y,
      rotation: slot.rotation,
      size: footprint * Math.sqrt(weights[i]! / heaviest),
      weight: weights[i]!,
      color: property("color")?.color ?? "currentColor",
      shape: encoded.shape === null ? 0 : property("shape")!.shape,
      lightness: property("lightness")?.lightness ?? null,
    };
  });

  // The unknown entry is listed only when something is unknown.
  for (const group of groups)
    group.entries = group.entries.filter((e) => !e.unknown || e.count > 0);
  const warnings: string[] = [];
  for (const channel of ["color", "shape"] as const) {
    const id = encoded[channel];
    if (id === null) continue;
    const shown = groupOf.get(id)!.entries.filter((e) => !e.unknown && e.count > 0).length;
    if (shown > DISTINCT[channel])
      warnings.push(
        `${channel === "color" ? "Colour" : "Shape"} shows ${shown} categories of "${byId.get(id)!.label}"; beyond ${DISTINCT[channel]} they repeat, so only the legend tells them apart.`,
      );
  }

  return {
    width: FRAME.width,
    height: FRAME.height,
    encoding: encoded,
    nodes,
    ridges: lines,
    form,
    ridgeSpacing: spacing,
    legends: groups,
    warnings,
    itemsPerMark,
    itemCount: items.length,
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
