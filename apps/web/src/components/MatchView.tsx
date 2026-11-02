import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { otherSeat, type GameState, type PlayerPresence, type PlayerSeat } from '@game/shared'
import { supabase } from '../lib/supabase.ts'
import { sfx } from '../lib/sfx.ts'
import { useMatch } from '../hooks/useMatch.ts'
import { useMatchChannel } from '../hooks/useMatchChannel.ts'
import { Scene } from '../scene/LazyScene.tsx'

interface Props {
  matchId: string
  userId: string
  onLeave: () => void
}

export function MatchView({ matchId, userId, onLeave }: Props) {
  const { match, applyUpdate, refresh } = useMatch(matchId)
  const [guess, setGuess] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)

  const hostId = match?.host_id
  const me = useMemo<PlayerPresence | null>(() => {
    if (!hostId) return null
    return {
      userId,
      seat: hostId === userId ? 'host' : 'guest',
      displayName: `Player-${userId.slice(0, 4)}`,
      onlineAt: '',
    }
  }, [hostId, userId])

  const { players, connected, send } = useMatchChannel(matchId, me, {
    sync: ({ match }) => applyUpdate(match),
  })

  // Someone arriving/leaving is a good moment to make sure we're not stale.
  const playerKey = players.map((p) => p.userId).sort().join()
  useEffect(() => {
    if (playerKey) refresh()
  }, [playerKey, refresh])

  const state = match?.state as GameState | undefined
  const status = match?.status
  const mySeat = me?.seat
  const myTurn = status === 'active' && state?.turn === mySeat

  useGameSounds(status, state, mySeat)

  const pick = useCallback(
    async (value: number) => {
      if (busy) return
      sfx.click()
      setBusy(true)
      setError(null)
      const { data, error } = await supabase.rpc('make_guess', { match_id: matchId, guess: value })
      setBusy(false)
      if (error) {
        sfx.error()
        return setError(error.message)
      }
      setGuess('')
      applyUpdate(data)
      send('sync', { match: data })
    },
    [busy, matchId, applyUpdate, send],
  )

  if (!match || !state || !mySeat) {
    return (
      <>
        <Scene mode="idle" />
        <div className="hud center">
          <p className="loading">Loading match…</p>
        </div>
      </>
    )
  }

  const online = (seat: PlayerSeat) => players.some((p) => p.seat === seat)
  const last = state.guesses.at(-1)
  const lost = state.loser === mySeat
  const forced = state.low === state.high

  function submit(e: FormEvent) {
    e.preventDefault()
    if (guess !== '') void pick(Number(guess))
  }

  async function copyInvite() {
    const link = `${location.origin}${location.pathname}?join=${match!.code}`
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      prompt('Copy this invite link:', link)
    }
  }

  return (
    <>
      <Scene
        mode="play"
        low={state.low}
        high={state.high}
        guesses={state.guesses}
        mystery={state.mystery}
        interactive={myTurn && !busy}
        onPick={pick}
        celebrate={status === 'finished' && !lost}
      />

      <div className="hud">
        <header className="topbar">
          <button className="chip" onClick={copyInvite} title="Copy invite link">
            <span className="chip-label">Code</span> {match.code} {copied ? '✓' : '⧉'}
          </button>
          <button className="btn btn-ghost" onClick={onLeave}>
            Leave
          </button>
        </header>

        <div className="versus">
          {(['host', 'guest'] as const).map((seat, i) => (
            <div key={seat} className="versus-side">
              {i === 1 && <span className="vs">VS</span>}
              <div
                className={`player-card ${seat} ${status === 'active' && state.turn === seat ? 'turn' : ''}`}
              >
                <span className={`dot ${online(seat) ? 'on' : ''}`} />
                <span className="player-name">{seat === mySeat ? 'You' : 'Rival'}</span>
              </div>
            </div>
          ))}
        </div>

        {status !== 'waiting' && (
          <div className="zone">
            <span className="zone-label">Safe zone</span>
            <span key={`${state.low}-${state.high}`} className="zone-range">
              {forced ? state.low : `${state.low} – ${state.high}`}
            </span>
          </div>
        )}

        <div className="spacer" />

        {status === 'active' && (
          <footer className="dock">
            {last && (
              <p key={state.moveCount} className="toast">
                {last.seat === mySeat ? 'You' : 'Rival'} picked <b>{last.value}</b>. Safe!
              </p>
            )}
            <p className={`banner ${myTurn ? 'mine' : ''}`}>
              {myTurn
                ? forced
                  ? 'Only one tile left… good luck 💣'
                  : 'Your turn: tap a tile'
                : 'Rival is thinking…'}
            </p>
            <form onSubmit={submit} className="guess-form">
              <input
                className="guess-input"
                type="number"
                inputMode="numeric"
                min={state.low}
                max={state.high}
                value={guess}
                onChange={(e) => setGuess(e.target.value)}
                placeholder={`${state.low}–${state.high}`}
                disabled={!myTurn || busy}
                aria-label="Your guess"
              />
              <button className="btn btn-primary" type="submit" disabled={!myTurn || busy || guess === ''}>
                Pick
              </button>
            </form>
            {error && <p className="error">{error}</p>}
            <small className="status-line">
              {connected ? '● Live' : '○ Connecting…'} · rival {online(otherSeat(mySeat)) ? 'online' : 'offline'}
            </small>
          </footer>
        )}
      </div>

      {status === 'waiting' && (
        <div className="overlay">
          <section className="panel waiting">
            <p className="eyebrow">Waiting for a rival</p>
            <div className="big-code">
              {match.code.split('').map((ch, i) => (
                <span key={i} style={{ animationDelay: `${i * 0.08}s` }}>
                  {ch}
                </span>
              ))}
            </div>
            <p className="muted">Share this code, or send the invite link.</p>
            <button className="btn btn-primary" onClick={copyInvite}>
              {copied ? 'Link copied!' : 'Copy invite link'}
            </button>
          </section>
        </div>
      )}

      {status === 'finished' && (
        <div className="overlay delayed">
          <section className={`panel result ${lost ? 'lose' : 'win'}`}>
            <h2 className="result-title">{lost ? 'BOOM!' : 'You survived!'}</h2>
            <p className="result-sub">
              {lost ? 'You hit the mystery number.' : 'Your rival hit the mystery number.'}
            </p>
            <div className="mystery">
              <span>Mystery number</span>
              <b>{state.mystery}</b>
            </div>
            <p className="muted">
              {state.moveCount} {state.moveCount === 1 ? 'pick' : 'picks'} this round
            </p>
            <button className="btn btn-primary btn-big" onClick={onLeave}>
              Play again
            </button>
          </section>
        </div>
      )}
    </>
  )
}

/** Plays sound cues when the match changes, whichever client caused it. */
function useGameSounds(status: string | undefined, state: GameState | undefined, mySeat: PlayerSeat | undefined) {
  const prev = useRef<{ moves: number; status: string } | null>(null)
  const moves = state?.moveCount
  const turn = state?.turn
  const loser = state?.loser

  useEffect(() => {
    if (moves === undefined || !status) return
    const before = prev.current
    prev.current = { moves, status }
    if (!before) return

    if (moves > before.moves) {
      if (status === 'finished') {
        sfx.boom()
        if (loser !== mySeat) setTimeout(sfx.win, 900)
      } else {
        sfx.safe()
        if (turn === mySeat) setTimeout(sfx.turn, 300)
      }
    } else if (before.status === 'waiting' && status === 'active') {
      sfx.turn()
    }
  }, [moves, status, turn, loser, mySeat])
}
