import type { PlayerSeat } from '@game/shared'

export const SEAT_COLORS: Record<PlayerSeat, string> = {
  host: '#22d3ee',
  guest: '#f472b6',
}

export const OUT_COLOR = '#262a3b'
export const BOMB_COLOR = '#ff3355'

/** Rainbow sweep across 1..100 for live tiles. */
export const liveHue = (n: number) => 0.62 - (n / 100) * 0.62
