// src/logic/points.ts

/**
 * Compressed power scoring:
 * - Bottom rank always gets 1 point
 * - Top grows with number of items (≈25 for 10 items, higher for larger lists)
 */
const p = 1.946;
const topForN10 = 25;

function calcA() {
  return (topForN10 - 1) / (Math.pow(10, p) - 1);
}

export function positionToPoints(position: number, total: number) {
  const A = calcA();
  const r = position; // 1 = best, total = worst
  const raw = 1 + A * (Math.pow(total - r + 1, p) - 1);
  return Math.max(1, Math.round(raw));
}