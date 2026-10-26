import type { FingerprintForm, Point } from "./types";

/** The fixed frame every layout is drawn in: a portrait fingertip with a small margin. */
export const FRAME = { width: 400, height: 520, cx: 200, cy: 260, rx: 180, ry: 240 } as const;

const DEG = Math.PI / 180;

/** Normalised radius of the fingertip outline through a point: 1 on the outline. */
export const outlineRadius = (x: number, y: number) =>
  Math.hypot((x - FRAME.cx) / FRAME.rx, (y - FRAME.cy) / FRAME.ry);

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Where the ridges curl (cores) and split three ways (deltas). */
export interface Singularities {
  centre: Point;
  cores: Point[];
  deltas: Point[];
}

/**
 * Places a shape's singular points. A loop has one core and one delta below it to one side; a
 * whorl two cores and a delta either side; an arch none.
 */
export function singularities(shape: FingerprintForm): Singularities {
  const { rx, ry, cx, cy } = FRAME;
  const centre: Point = [cx + shape.coreX * 0.12 * rx, cy - 0.1 * ry + shape.coreY * 0.1 * ry];
  const [x, y] = centre;
  if (shape.pattern === "arch") return { centre, cores: [], deltas: [] };
  if (shape.pattern === "loop")
    return {
      centre,
      cores: [centre],
      deltas: [
        [x + shape.hand * (0.4 + 0.25 * shape.spread) * rx, y + (0.38 + 0.12 * shape.spread) * ry],
      ],
    };
  const twist = 0.06 * rx;
  return {
    centre,
    cores: [
      [x - twist, y - shape.hand * 0.025 * ry],
      [x + twist, y + shape.hand * 0.025 * ry],
    ],
    deltas: [
      [x - (0.5 + 0.2 * shape.spread) * rx, y + 0.42 * ry],
      [x + (0.5 + 0.2 * shape.spread) * rx, y + 0.42 * ry],
    ],
  };
}

/**
 * Ridge direction at a point, in radians, modulo pi.
 *
 * Inside, the Sherlock-Monro model: half the sum of the angles to each core minus half the sum to
 * each delta, which is what makes ridges curl round a core and split at a delta. An arch has no
 * singular points, so its ridges follow a raised bump instead. Near the outline, and mostly over the
 * top, ridges bend to follow it, as they do round a fingertip.
 */
export function orientation(
  x: number,
  y: number,
  shape: FingerprintForm,
  s: Singularities,
): number {
  const tilt = shape.tilt * DEG;
  let theta: number;
  if (shape.pattern === "arch") {
    const width = (0.35 + 0.25 * shape.spread) * FRAME.rx;
    const u = (x - s.centre[0]) / width;
    const height = 0.3 * FRAME.ry * Math.max(0, 1 - Math.abs(y - s.centre[1]) / FRAME.ry);
    theta = tilt + Math.atan(((2 * height * u) / width) * Math.exp(-u * u));
  } else {
    let sum = 0;
    for (const [px, py] of s.cores) sum += Math.atan2(y - py, x - px);
    for (const [px, py] of s.deltas) sum -= Math.atan2(y - py, x - px);
    theta = tilt + sum / 2;
  }
  // Blend towards the outline's tangent, as doubled angles so pi-periodic directions average.
  const r = outlineRadius(x, y);
  // Strongest over the top of the fingertip, easing to 40% below it: a step here kinks ridges.
  const over = smoothstep(FRAME.cy + 0.25 * FRAME.ry, FRAME.cy - 0.25 * FRAME.ry, y);
  const weight = smoothstep(0.68, 1, r) * (0.4 + 0.6 * over);
  if (weight === 0) return theta;
  const tangent = Math.atan2((x - FRAME.cx) / FRAME.rx ** 2, -(y - FRAME.cy) / FRAME.ry ** 2);
  const vx = (1 - weight) * Math.cos(2 * theta) + weight * Math.cos(2 * tangent);
  const vy = (1 - weight) * Math.sin(2 * theta) + weight * Math.sin(2 * tangent);
  return Math.atan2(vy, vx) / 2;
}

/** A spatial hash of every accepted ridge point, for the spacing checks. */
class PointGrid {
  private cells = new Map<number, { x: number; y: number; line: number; index: number }[]>();
  constructor(private size: number) {}
  private key = (gx: number, gy: number) => gx * 4096 + gy;
  /** Returns the cell key, so a rejected ridge can be taken out again cheaply. */
  add(x: number, y: number, line: number, index: number) {
    const k = this.key(Math.floor(x / this.size), Math.floor(y / this.size));
    const cell = this.cells.get(k);
    if (cell) cell.push({ x, y, line, index });
    else this.cells.set(k, [{ x, y, line, index }]);
    return k;
  }
  removeLine(line: number, keys: Iterable<number>) {
    for (const k of new Set(keys)) {
      const kept = (this.cells.get(k) ?? []).filter((p) => p.line !== line);
      if (kept.length) this.cells.set(k, kept);
      else this.cells.delete(k);
    }
  }
  /** True when a point closer than `distance` passes `counts`. `distance` must not exceed the cell size. */
  near(
    x: number,
    y: number,
    distance: number,
    counts: (p: { line: number; index: number }) => boolean,
  ) {
    const gx = Math.floor(x / this.size);
    const gy = Math.floor(y / this.size);
    for (let dx = -1; dx <= 1; dx++)
      for (let dy = -1; dy <= 1; dy++)
        for (const p of this.cells.get(this.key(gx + dx, gy + dy)) ?? [])
          if ((p.x - x) ** 2 + (p.y - y) ** 2 < distance ** 2 && counts(p)) return true;
    return false;
  }
}

/** Ridges stop this far inside the outline. */
const OUTLINE_LIMIT = 0.985;

/**
 * Evenly spaced ridges along the shape's flow field (Jobard and Lefer's streamline placement),
 * core outwards. Each ridge is traced both ways from a seed until it would come within `spacing`
 * of another ridge, of a singular point, of a distant part of itself, or of the outline; new seeds
 * are tried one spacing either side of every accepted ridge. A dropped-out ridge end is a ridge
 * ending, exactly as in a real print.
 *
 * Every point of every ridge is at least about `spacing` from every other ridge, which is what lets
 * marks of that size sit on them without touching.
 */
export function ridges(shape: FingerprintForm, spacing: number): Point[][] {
  const s = singularities(shape);
  const step = spacing * 0.3;
  const selfGap = Math.ceil((3 * spacing) / step);
  const minLength = Math.ceil((2 * spacing) / step);
  const maxSteps = Math.ceil((4 * Math.PI * (FRAME.rx + FRAME.ry)) / step);
  const grid = new PointGrid(spacing);
  const lines: Point[][] = [];
  const singular = [...s.cores, ...s.deltas];

  const free = (x: number, y: number, line: number, index: number) =>
    outlineRadius(x, y) <= OUTLINE_LIMIT &&
    singular.every(([px, py]) => Math.hypot(x - px, y - py) > spacing * 0.6) &&
    !grid.near(x, y, spacing, (p) => p.line !== line || Math.abs(p.index - index) > selfGap);

  const direction = (x: number, y: number, previous: Point): Point => {
    const theta = orientation(x, y, shape, s);
    const v: Point = [Math.cos(theta), Math.sin(theta)];
    return v[0] * previous[0] + v[1] * previous[1] < 0 ? [-v[0], -v[1]] : v;
  };

  const trace = (seed: Point): Point[] | null => {
    const line = lines.length;
    const theta = orientation(seed[0], seed[1], shape, s);
    const keys = [grid.add(seed[0], seed[1], line, 0)];
    const halves = ([1, -1] as const).map((sign) => {
      const points: Point[] = [];
      let p = seed;
      let previous: Point = [sign * Math.cos(theta), sign * Math.sin(theta)];
      for (let i = 1; i <= maxSteps; i++) {
        // Second-order Runge-Kutta: sample the direction half a step ahead.
        const v1 = direction(p[0], p[1], previous);
        const v2 = direction(p[0] + (v1[0] * step) / 2, p[1] + (v1[1] * step) / 2, v1);
        // A ridge turns gently; a sharp turn in one step means the field folds here, so end it.
        if (v2[0] * previous[0] + v2[1] * previous[1] < 0.8) break;
        const q: Point = [p[0] + v2[0] * step, p[1] + v2[1] * step];
        if (!free(q[0], q[1], line, sign * i)) break;
        keys.push(grid.add(q[0], q[1], line, sign * i));
        points.push(q);
        p = q;
        previous = v2;
      }
      return points;
    });
    const points = [...halves[1]!.reverse(), seed, ...halves[0]!];
    if (points.length < minLength) {
      grid.removeLine(line, keys);
      return null;
    }
    return points;
  };

  const queue: Point[] = [];
  const seedFrom = (points: Point[]) => {
    const every = Math.max(1, Math.round(spacing / step / 2));
    for (let i = 1; i < points.length - 1; i += every) {
      const [ax, ay] = points[i - 1]!;
      const [bx, by] = points[i + 1]!;
      const length = Math.hypot(bx - ax, by - ay) || 1;
      const [nx, ny] = [-(by - ay) / length, (bx - ax) / length];
      const [x, y] = points[i]!;
      queue.push([x + nx * spacing, y + ny * spacing], [x - nx * spacing, y - ny * spacing]);
    }
  };
  const attempt = (seed: Point) => {
    if (!free(seed[0], seed[1], -1, 0)) return;
    const points = trace(seed);
    if (!points) return;
    lines.push(points);
    seedFrom(points);
  };
  let next = 0;
  const drain = () => {
    while (next < queue.length) attempt(queue[next++]!);
  };

  // Start just above the core and grow outwards; then sweep for any region the growth missed.
  queue.push([s.centre[0], s.centre[1] - spacing]);
  drain();
  const sweep: Point[] = [];
  for (let x = FRAME.cx - FRAME.rx; x <= FRAME.cx + FRAME.rx; x += spacing / 2)
    for (let y = FRAME.cy - FRAME.ry; y <= FRAME.cy + FRAME.ry; y += spacing / 2)
      if (outlineRadius(x, y) <= OUTLINE_LIMIT) sweep.push([x, y]);
  const distance = ([x, y]: Point) => Math.hypot(x - s.centre[0], y - s.centre[1]);
  sweep.sort((a, b) => distance(a) - distance(b) || a[0] - b[0] || a[1] - b[1]);
  for (const seed of sweep) {
    attempt(seed);
    drain();
  }

  return orderFromCore(lines, s.centre);
}

/**
 * Ridges sorted by how close they come to the core, each running clockwise round it, so marks laid
 * along them in turn form runs from the core outwards.
 */
function orderFromCore(lines: Point[][], [cx, cy]: Point): Point[][] {
  const reach = (line: Point[]) => Math.min(...line.map(([x, y]) => Math.hypot(x - cx, y - cy)));
  const swept = (line: Point[]) => {
    let total = 0;
    for (let i = 1; i < line.length; i++) {
      let d =
        Math.atan2(line[i]![1] - cy, line[i]![0] - cx) -
        Math.atan2(line[i - 1]![1] - cy, line[i - 1]![0] - cx);
      if (d > Math.PI) d -= 2 * Math.PI;
      if (d < -Math.PI) d += 2 * Math.PI;
      total += d;
    }
    return total;
  };
  return lines
    .map((line) => ({ line: swept(line) < 0 ? [...line].reverse() : line, reach: reach(line) }))
    .sort(
      (a, b) => a.reach - b.reach || a.line[0]![0] - b.line[0]![0] || a.line[0]![1] - b.line[0]![1],
    )
    .map(({ line }) => line);
}
