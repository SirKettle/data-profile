import type { Point } from "./types";

export function polylineLength(points: readonly Point[]): number {
  let length = 0;
  for (let i = 1; i < points.length; i++)
    length += Math.hypot(points[i]![0] - points[i - 1]![0], points[i]![1] - points[i - 1]![1]);
  return length;
}

/**
 * Splits `count` across ridges so the most crowded ridge is as uncrowded as possible: every ridge
 * first gets as many slots as fit at the average spacing, then each remaining slot goes to the
 * ridge whose spacing it shrinks least (the D'Hondt rule). Ties go to the earlier ridge, so the
 * result is stable.
 */
function allocate(lengths: readonly number[], count: number): number[] {
  const total = lengths.reduce((sum, length) => sum + length, 0);
  if (total === 0 || count === 0) return lengths.map(() => 0);
  const average = total / count;
  const counts = lengths.map((length) => Math.floor(length / average));
  for (let left = count - counts.reduce((sum, n) => sum + n, 0); left > 0; left--) {
    let best = 0;
    for (let i = 1; i < lengths.length; i++)
      if (lengths[i]! / (counts[i]! + 1) > lengths[best]! / (counts[best]! + 1)) best = i;
    counts[best]! += 1;
  }
  return counts;
}

/** The point and direction (degrees) at arc length `at` along a polyline. */
function pointAt(line: readonly Point[], at: number) {
  let walked = 0;
  for (let i = 1; i < line.length; i++) {
    const [x0, y0] = line[i - 1]!;
    const [x1, y1] = line[i]!;
    const segment = Math.hypot(x1 - x0, y1 - y0);
    if (at <= walked + segment || i === line.length - 1) {
      const f = segment === 0 ? 0 : Math.min(1, (at - walked) / segment);
      return {
        x: x0 + (x1 - x0) * f,
        y: y0 + (y1 - y0) * f,
        rotation: (Math.atan2(y1 - y0, x1 - x0) * 180) / Math.PI,
      };
    }
    walked += segment;
  }
  const [x, y] = line[0]!;
  return { x, y, rotation: 0 };
}

/**
 * `count` positions along the ridges, in ridge order. Each ridge gets slots by `allocate` and spaces them evenly over its whole length, so a closed ring has no crowded seam where
 * its end meets its start. `pitch` is the smallest spacing between
 * neighbours on any ridge.
 */
export function slotsAlong(lines: readonly Point[][], count: number) {
  const lengths = lines.map(polylineLength);
  const counts = allocate(lengths, count);
  const slots: { x: number; y: number; rotation: number }[] = [];
  let pitch = Infinity;
  lines.forEach((line, k) => {
    const n = counts[k]!;
    if (n === 0) return;
    const step = lengths[k]! / n;
    // A ridge with one slot has no neighbour along it, so its length says nothing about crowding.
    if (n > 1) pitch = Math.min(pitch, step);
    for (let i = 0; i < n; i++) slots.push(pointAt(line, (i + 0.5) * step));
  });
  // Infinity when no ridge holds two slots: nothing along a ridge then limits mark size.
  return { slots, pitch };
}
