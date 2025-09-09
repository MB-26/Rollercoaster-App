// src/logic/points.ts

export type HingedExpConfig = {
  /** fraction (0..1) of the list (from worst→best) that is linear; 0.5 = halfway */
  pivotFrac: number;
  /** top multiplier K: #1 ≈ pivotScore * K (keeps numbers modest & controllable) */
  topMultiplier: number; // e.g. 6–10
  /** rounding mode */
  rounding?: "nearest" | "floor" | "ceil";
};

export const defaultHinged: HingedExpConfig = {
  pivotFrac: 0.5,       // linear up to halfway
  topMultiplier: 8,     // top ≈ 8× pivot score
  rounding: "nearest",
};

function roundInt(x: number, mode: HingedExpConfig["rounding"]) {
  switch (mode) {
    case "floor": return Math.max(1, Math.floor(x));
    case "ceil":  return Math.max(1, Math.ceil(x));
    default:      return Math.max(1, Math.round(x));
  }
}

/**
 * Hinged linear→exponential points:
 * - bottom starts at 1 and increases by +1 per rank up to the pivot
 * - above the pivot it grows exponentially, ending ~ pivot * topMultiplier at #1
 *
 * @param position 1 = best, total = worst
 * @param total total items (N)
 * @param cfg configure hinge & steepness
 */
export function positionToPoints(
  position: number,
  total: number,
  cfg: HingedExpConfig = defaultHinged
): number {
  const N = Math.max(1, total);
  const r = Math.min(Math.max(1, position), N);
  const i = N - r + 1; // 1..N (from worst to best)

  // pivot index (from bottom). Clamp to [1, N]
  const m = Math.min(N, Math.max(1, Math.round(N * cfg.pivotFrac)));

  if (i <= m || m === N) {
    // Pure linear region (or pivot at the very top)
    return i;
  }

  // Exponential region: choose base so that top ≈ m * K
  const steps = N - m; // number of geometric steps above pivot
  const K = Math.max(1.0001, cfg.topMultiplier); // avoid degenerate 1.0
  const b = Math.pow(K, 1 / steps);

  const raw = m * Math.pow(b, i - m);
  return roundInt(raw, cfg.rounding);
}

// Optional helper to describe the schedule in UI
export const defaultLinear = {
  description:
    "Hinged points: +1 per rank up to pivot, then exponential to a configurable top. Bottom = 1.",
};
