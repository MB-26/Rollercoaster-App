// src/logic/points.ts

export type TieredPointsConfig = {
  linearPct: number;     // bottom %
  accelPct: number;      // middle %
  godMultiplier: number; // top tier growth (e.g. 1.5)
};

// Default: 50% linear, 40% accelerating, 10% god tier
export const defaultTiered: TieredPointsConfig = {
  linearPct: 0.5,
  accelPct: 0.4,
  godMultiplier: 1.5,
};

/**
 * Position 1 = WORST
 * Position N = BEST
 * Always returns whole numbers
 */
export function positionToPoints(
  position: number,
  total: number,
  cfg: TieredPointsConfig = defaultTiered
): number {
  if (position < 1 || position > total || total < 1) return 0;

  const linearEnd = Math.floor(total * cfg.linearPct);
  const accelEnd = linearEnd + Math.floor(total * cfg.accelPct);

  const scores: number[] = new Array(total);

  let score = 1;
  let increment = 1;

  scores[0] = score; // worst coaster

  for (let i = 1; i < total; i++) {
    const p = i + 1;

    if (p <= linearEnd) {
      increment = 1;
    } else if (p <= accelEnd) {
      increment += 1;
    } else {
      increment = Math.round(increment * cfg.godMultiplier);
    }

    score += increment;
    scores[i] = score;
  }

  return scores[position - 1];
}
