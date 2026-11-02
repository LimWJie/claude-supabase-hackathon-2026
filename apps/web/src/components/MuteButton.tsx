import { useState } from 'react'
import { isMuted, setMuted, sfx } from '../lib/sfx.ts'

export function MuteButton() {
  const [muted, setState] = useState(isMuted)

  function toggle() {
    setMuted(!muted)
    setState(!muted)
    if (muted) sfx.click()
  }

  return (
    <button className="icon-btn" onClick={toggle} aria-label={muted ? 'Unmute' : 'Mute'} title={muted ? 'Unmute' : 'Mute'}>
      {muted ? '🔇' : '🔊'}
    </button>
  )
}
