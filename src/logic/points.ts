// src/logic/points.ts

export type TieredPointsConfig = {
  linearPct: number;      // e.g. 0.5  -> bottom 50%
  accelPct: number;       // e.g. 0.4  -> next 40%
  godMultiplier: number;  // e.g. 1.5  -> top tier growth
};

// Default configuration (50% / 40% / 10%)
export const defaultTiered: TieredPointsConfig = {
  linearPct: 0.5,
  accelPct: 0.4,
  godMultiplier: 1.5,
};

/**
 * Converts a 1-based position into points.
 * Position 1 = worst, position N = best.
 *
 * @param position 1-based rank position
 * @param total Total number of ranked items
 * @param cfg Tiered scoring configuration
 */
export function positionToPoints(
  position: number,
  total: number,
  cfg: TieredPointsConfig = defaultTiered
): number {
  if (position < 1 || total < 1) return 0;

  const linearEnd = Math.floor(total * cfg.linearPct);
  const accelEnd = linearEnd + Math.floor(total * cfg.accelPct);

  let score = 1;
  let increment = 1;

  for (let p = 2; p <= position; p++) {
    if (p <= linearEnd) {
      // Phase 1: linear
      increment = 1;
    } else if (p <= accelEnd) {
      // Phase 2: accelerating (+1 each step)
      increment += 1;
    } else {
      // Phase 3: god tier (×1.5, rounded)
      increment = Math.round(increment * cfg.godMultiplier);
    }

    score += increment;
  }

  return score;
}
