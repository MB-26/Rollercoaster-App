// src/logic/points.ts

export type AcceleratingPoints = {
  pivotFraction: number; // e.g. 0.5 = halfway
};

export const defaultAccelerating: AcceleratingPoints = {
  pivotFraction: 0.5,
};

export function positionToPoints(
  position: number,
  total: number,
  cfg: AcceleratingPoints = defaultAccelerating
): number {
  if (total <= 0) return 0;

  // Convert rank to ascending index (1 = worst, N = best)
  const i = total - position + 1;

  const pivot = Math.max(1, Math.floor(total * cfg.pivotFraction));

  if (i <= pivot) {
    // Linear section
    return i;
  }

  // Accelerating section (triangular growth)
  const k = i - pivot;
  return pivot + (k * (k + 1)) / 2;
}
