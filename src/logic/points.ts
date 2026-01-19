// src/logic/points.ts

export type TieredPointsConfig = {
  linearPct: number;     // bottom %
  accelPct: number;      // middle %
  godMultiplier: number; // top tier growth
};

// 50% linear, 40% accelerating, 10% god tier
export const defaultTiered: TieredPointsConfig = {
  linearPct: 0.5,
  accelPct: 0.4,
  godMultiplier: 1.5,
};

/**
 * Position 1 = BEST
 * Position N = WORST
 * Returns whole-number points
 * NO other code changes required
 */
export function positionToPoints(
  position: number,
  total: number,
  cfg: TieredPointsConfig = defaultTiered
): number {
  if (position < 1 || position > total || total < 1) return 0;

  // 🔑 Fix: invert position internally
  const effectivePosition = total - position + 1;

  const linearEnd = Math.floor(total * cfg.linearPct);
  const accelEnd = linearEnd + Math.floor(total * cfg.accelPct);

  let score = 1;
  let increment = 1;

  for (let p = 2; p <= effectivePosition; p++) {
    if (p <= linearEnd) {
      increment = 1;
    } else if (p <= accelEnd) {
      increment += 1;
    } else {
      increment = Math.round(increment * cfg.godMultiplier);
    }
    score += increment;
  }

  return score;
}
