import { compareIds } from "./hash";
import { DEFAULT_PALETTE, UNKNOWN_COLOR } from "./palette";
import type {
  Channel,
  Dimension,
  Encoding,
  Item,
  LegendEntry,
  LegendGroup,
  Mark,
  Profile,
  ProfileInput,
} from "./types";

/** The id of the category unknown values fall into. Reserved: a dimension may not use it. */
export const UNKNOWN_CATEGORY_ID = "~unknown";

/**
 * Data a view cannot draw truthfully: duplicate item ids, a weight that is not positive, a reserved
 * or duplicated category id, an encoding naming no dimension, or lightness on an unordered
 * dimension. `encodeProfile` throws it.
 */
export class DataError extends Error {
  override name = "DataError";
}

/** A usable count, or undefined for anything else (undefined, NaN, zero, negative). */
const positive = (value: number | undefined) =>
  value !== undefined && Number.isFinite(value) && value >= 1 ? Math.floor(value) : undefined;

/** Beyond these, a property stops telling categories apart: palette colours repeat, and the default renderers have five shapes. */
const DISTINCT = { color: 10, shape: 5 } as const;

/** What a profile needs of an items array whatever the view: validated once, then reused. */
interface PreparedItems {
  /** `idRank[i]` is item i's place in id order: the stable tie-break. */
  idRank: Uint32Array;
  /** Each dimension's category rank per item; unknown ranks after every category. */
  ranks: WeakMap<Dimension, Int32Array>;
}

/**
 * Items arrays are treated as immutable: switching view encodes the same array again, so its
 * validation, id order and per-dimension ranks are worked out once and kept with it. This is what
 * keeps a view change fast for a very large dataset; only a sort of numbers remains.
 */
const prepared = new WeakMap<readonly Item[], PreparedItems>();
function prepare(items: readonly Item[]): PreparedItems {
  const hit = prepared.get(items);
  if (hit) return hit;
  const seen = new Set<string>();
  for (const item of items) {
    if (seen.has(item.id)) throw new DataError(`Duplicate item id "${item.id}"`);
    seen.add(item.id);
    const weight = item.weight ?? 1;
    if (!Number.isFinite(weight) || weight <= 0)
      throw new DataError(`Item "${item.id}" has weight ${weight}; weights must be positive`);
  }
  const byId = Uint32Array.from(items.keys()).sort((a, b) =>
    compareIds(items[a]!.id, items[b]!.id),
  );
  const idRank = new Uint32Array(items.length);
  byId.forEach((index, rank) => (idRank[index] = rank));
  const result = { idRank, ranks: new WeakMap<Dimension, Int32Array>() };
  prepared.set(items, result);
  return result;
}

function ranksIn(items: readonly Item[], ready: PreparedItems, d: Dimension) {
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

function validateDimension(dimension: Dimension) {
  const categories = new Set<string>();
  for (const category of dimension.categories) {
    if (category.id === UNKNOWN_CATEGORY_ID)
      throw new DataError(`Category id "${UNKNOWN_CATEGORY_ID}" is reserved`);
    if (categories.has(category.id))
      throw new DataError(`Duplicate category id "${category.id}" in "${dimension.id}"`);
    categories.add(category.id);
  }
}

/** Fills in an encoding's defaults: colour and shape follow `arrange` unless set, lightness is off. */
function resolveEncoding(
  dimensions: readonly Dimension[],
  encoding: Encoding | undefined,
): Required<Encoding> {
  const arrange = encoding?.arrange ?? dimensions[0]?.id;
  if (arrange === undefined) throw new DataError("At least one dimension is needed");
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
      throw new DataError(`The ${channel} encoding names "${id}", which is not a dimension`);
    if (channel === "lightness" && !dimension.ordered)
      throw new DataError(
        `"${id}" drives lightness but is not ordered; lighter and darker would read as less and more`,
      );
  }
  return resolved;
}

/**
 * Works out what to draw for a dataset, before any view places it: one mark per item, in order,
 * each with its colour, shape and lightness, plus a legend per encoded dimension.
 *
 * `encoding` says which dimension arranges the marks and which drive colour, shape and lightness
 * (see `Encoding`); left out, the first dimension does all but lightness. Marks are sorted by the
 * arranging dimension's category order, then by each other encoded dimension's, then by item id,
 * so categories form runs. A view lays them out in that order.
 *
 * A pure function of its input: the same items, dimensions, encoding and cap give the same profile
 * whatever order the items arrive in. The items array is treated as immutable: work is cached
 * against it.
 *
 * Above `maxMarks` items, consecutive items that agree on **every** encoded dimension share a mark
 * (`itemsPerMark` > 1), so a mark never misrepresents any item in it. Nothing is sampled away.
 */
export function encodeProfile(input: ProfileInput): Profile {
  const { items, dimensions, encoding } = input;
  const maxMarks = positive(input.maxMarks) ?? Infinity;
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
  const categoryAt = (d: Dimension, rank: number) => d.categories[rank]?.id ?? UNKNOWN_CATEGORY_ID;

  const groups: LegendGroup[] = used.map((d) => {
    const channels = (["color", "shape", "lightness", "arrange"] as const).filter(
      (c) => encoded[c] === d.id,
    );
    const drives = (c: Channel) => channels.includes(c);
    const entry = (
      id: string,
      label: string,
      i: number | null,
      color?: string,
      href?: string,
    ): LegendEntry => ({
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
  const marksOf: { key: string; categories: Record<string, string>; members: Item[] }[] = [];
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

  const perKey = new Map<string, number>();
  const marks: Mark[] = marksOf.map((mark) => {
    const n = perKey.get(mark.key) ?? 0;
    perKey.set(mark.key, n + 1);
    const property = (channel: "color" | "shape" | "lightness") => {
      const id = encoded[channel];
      return id === null ? null : entryOf(id, mark.categories[id]!);
    };
    return {
      id: itemsPerMark === 1 ? mark.members[0]!.id : `${mark.key}#${n}`,
      itemIds: mark.members.map((item) => item.id),
      categories: mark.categories,
      weight: mark.members.reduce((sum, item) => sum + (item.weight ?? 1), 0),
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

  return { encoding: encoded, marks, legends: groups, warnings, itemsPerMark, itemCount: n };
}
