// src/logic/points.ts
export type LinearPoints = { start: number; step: number; min: number };

// Default: #1 = 100, then -2 per position, never below 0
export const defaultLinear: LinearPoints = { start: 100, step: 2, min: 0 };

export function positionToPoints(position: number, cfg: LinearPoints = defaultLinear) {
  return Math.max(cfg.min, cfg.start - (position - 1) * cfg.step);
}
