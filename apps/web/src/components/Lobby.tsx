import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase.ts'
import { sfx } from '../lib/sfx.ts'
import { Scene } from '../scene/LazyScene.tsx'

const initialCode = () => new URLSearchParams(location.search).get('join')?.toUpperCase().slice(0, 6) ?? ''

export function Lobby({ onEnter }: { onEnter: (matchId: string) => void }) {
  const [code, setCode] = useState(initialCode)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function create() {
    sfx.click()
    setBusy(true)
    setError(null)
    const { data, error } = await supabase.rpc('create_match')
    setBusy(false)
    if (error) {
      sfx.error()
      return setError(error.message)
    }
    onEnter(data.id)
  }

  async function join(e: FormEvent) {
    e.preventDefault()
    sfx.click()
    setBusy(true)
    setError(null)
    const { data, error } = await supabase.rpc('join_match', { match_code: code })
    setBusy(false)
    if (error) {
      sfx.error()
      return setError(error.message)
    }
    history.replaceState(null, '', location.pathname)
    onEnter(data.id)
  }

  return (
    <>
      <Scene mode="idle" />
      <div className="hud center">
        <section className="panel lobby">
          <span className="title-bomb" aria-hidden="true">
            💣
          </span>
          <h1 className="title">
            Mystery
            <br />
            Number
          </h1>
          <p className="tagline">Dodge the hidden number. Last one standing wins.</p>

          <button className="btn btn-primary btn-big" onClick={create} disabled={busy}>
            Create match
          </button>

          <div className="divider">
            <span>or join a friend</span>
          </div>

          <form onSubmit={join} className="join">
            <input
              className="code-input"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^0-9A-F]/g, ''))}
              placeholder="CODE"
              maxLength={6}
              aria-label="Match code"
              spellCheck={false}
              autoComplete="off"
            />
            <button className="btn btn-secondary" type="submit" disabled={busy || code.length !== 6}>
              Join
            </button>
          </form>

          {error && <p className="error">{error}</p>}

          <ol className="how">
            <li>A mystery number from 1–100 is hidden on the board.</li>
            <li>Take turns picking a tile. Each safe pick shrinks the range.</li>
            <li>Whoever picks the mystery number goes 💥.</li>
          </ol>
        </section>
      </div>
    </>
  )
}
