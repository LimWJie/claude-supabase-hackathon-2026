// Guess-the-number game. `GameState` is what gets persisted to
// `matches.state`; keep it a JSON-serialisable `type` (not an `interface`)
// so it stays assignable to `Json`. The server (make_guess RPC) is the only
// writer, so this mirrors the shape built in the SQL migrations.

export type MatchStatus = 'waiting' | 'active' | 'finished' | 'abandoned'

export type PlayerSeat = 'host' | 'guest'

export const MIN_NUMBER = 1
export const MAX_NUMBER = 100

export type Guess = {
  seat: PlayerSeat
  value: number
}

export type GameState = {
  /** Inclusive range the next guess must fall in. */
  low: number
  high: number
  turn: PlayerSeat
  moveCount: number
  guesses: Guess[]
  /** Set once someone hits the mystery number. */
  loser?: PlayerSeat
  /** Revealed only when the match is finished. */
  mystery?: number
}

export const initialGameState: GameState = {
  low: MIN_NUMBER,
  high: MAX_NUMBER,
  turn: 'host',
  moveCount: 0,
  guesses: [],
}

export const otherSeat = (seat: PlayerSeat): PlayerSeat => (seat === 'host' ? 'guest' : 'host')
