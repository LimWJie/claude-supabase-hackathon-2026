import { MAX_NUMBER, MIN_NUMBER } from '@game/shared'

export const COLS = 10
export const SPACING = 1.15

/** Board position of number `n`; 1 is top-left, 100 bottom-right. */
export function tilePosition(n: number): [number, number, number] {
  const i = n - MIN_NUMBER
  const col = i % COLS
  const row = Math.floor(i / COLS)
  const rows = Math.ceil((MAX_NUMBER - MIN_NUMBER + 1) / COLS)
  return [(col - (COLS - 1) / 2) * SPACING, ((rows - 1) / 2 - row) * SPACING, 0]
}
