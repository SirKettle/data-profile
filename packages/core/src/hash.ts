/** FNV-1a, 32-bit. Stable across runtimes, so a seed draws the same picture everywhere. */
export function stableHash(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) hash = Math.imul(hash ^ value.charCodeAt(i), 16777619);
  return hash >>> 0;
}

/** A value in [0, 1) derived from a key: the only source of variation in a layout. */
export const unitHash = (key: string) => stableHash(key) / 2 ** 32;

/** Code-unit order, so results never depend on the runtime's locale. */
export const compareIds = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
