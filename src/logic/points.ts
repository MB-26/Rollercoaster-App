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
