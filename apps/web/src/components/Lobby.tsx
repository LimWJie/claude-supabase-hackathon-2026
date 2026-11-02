import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase.ts'

export function Lobby({ onEnter }: { onEnter: (matchId: string) => void }) {
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function create() {
    setBusy(true)
    setError(null)
    const { data, error } = await supabase.rpc('create_match')
    setBusy(false)
    if (error) return setError(error.message)
    onEnter(data.id)
  }

  async function join(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const { data, error } = await supabase.rpc('join_match', { match_code: code })
    setBusy(false)
    if (error) return setError(error.message)
    onEnter(data.id)
  }

  return (
    <section className="card">
      <button onClick={create} disabled={busy}>
        Create match
      </button>
      <form onSubmit={join} className="row">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="Match code"
          maxLength={6}
        />
        <button type="submit" disabled={busy || code.length !== 6}>
          Join
        </button>
      </form>
      {error && <p className="error">{error}</p>}
    </section>
  )
}
