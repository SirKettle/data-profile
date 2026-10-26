import { unitHash } from "./hash";
import type { FingerprintDimension, FingerprintItem, FingerprintForm } from "./types";

const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));
/** Coarse steps, so a collection's fingerprint holds still as it grows by an item or two. */
const quantise = (value: number, step = 0.2) => Math.round(value / step) * step;

/** A plausible shape from a seed alone: the default when the consumer gives none. */
export function formFromSeed(seed: string): FingerprintForm {
  const h = (key: string) => unitHash(`${seed}:${key}`);
  return {
    pattern: "loop",
    hand: h("hand") < 0.5 ? -1 : 1,
    coreX: quantise(h("x") * 2 - 1) * 0.5,
    coreY: quantise(h("y") * 2 - 1) * 0.5,
    spread: quantise(h("spread")),
    tilt: Math.round((h("tilt") - 0.5) * 12),
  };
}

export function resolveForm(seed: string, shape: Partial<FingerprintForm> = {}): FingerprintForm {
  const resolved = { ...formFromSeed(seed), ...shape };
  return {
    ...resolved,
    coreX: clamp(resolved.coreX, -1, 1),
    coreY: clamp(resolved.coreY, -1, 1),
    spread: clamp(resolved.spread, 0, 1),
    tilt: clamp(resolved.tilt, -10, 10),
  };
}

/** Mean position (0 to 1) of known values within a dimension's category order, or 0.5. */
function lean(items: readonly FingerprintItem[], dimension: FingerprintDimension | undefined) {
  if (!dimension || dimension.categories.length < 2) return 0.5;
  const index = new Map(
    dimension.categories.map((c, i) => [c.id, i / (dimension.categories.length - 1)]),
  );
  let sum = 0;
  let n = 0;
  for (const item of items) {
    const at = index.get(item.values[dimension.id] ?? "");
    if (at !== undefined) {
      sum += at;
      n += 1;
    }
  }
  return n ? sum / n : 0.5;
}

/**
 * A shape that is the collection's own: derived only from the data, so the same collection always
 * draws the same fingerprint, and it changes slowly as the collection grows. It is a signature,
 * not a chart; say so beside it. The mapping, which a caption can state:
 *
 * - **Pattern.** An arch while there are fewer than 12 items; then a loop when one category of the
 *   first dimension holds 40% or more of the items (a focused collection); otherwise a whorl.
 * - **Core across, and loop direction.** Where the second dimension's values sit, on average, in its
 *   category order: earlier categories pull the core left, later ones right.
 * - **Core height.** The same for the third dimension.
 * - **Spread.** The share of all categories that have at least one item: broader reads looser.
 * - **Tilt.** From the seed only, so two equal collections still differ slightly.
 */
export function formFromItems(
  items: readonly FingerprintItem[],
  dimensions: readonly FingerprintDimension[],
  seed = "fingerprint",
): FingerprintForm {
  const [first, second, third] = dimensions;
  let top = 0;
  if (first) {
    const counts = new Map<string, number>();
    for (const item of items) {
      const value = item.values[first.id];
      if (value != null) counts.set(value, (counts.get(value) ?? 0) + 1);
    }
    top = items.length ? Math.max(0, ...counts.values()) / items.length : 0;
  }
  const total = dimensions.reduce((sum, d) => sum + d.categories.length, 0);
  const used = dimensions.reduce(
    (sum, d) =>
      sum + d.categories.filter((c) => items.some((item) => item.values[d.id] === c.id)).length,
    0,
  );
  const across = lean(items, second);
  return resolveForm(seed, {
    pattern: items.length < 12 ? "arch" : top >= 0.4 ? "loop" : "whorl",
    hand: across < 0.5 ? -1 : 1,
    coreX: quantise((across - 0.5) * 2),
    coreY: quantise((lean(items, third) - 0.5) * 2),
    spread: total ? quantise(used / total) : 0.5,
  });
}
