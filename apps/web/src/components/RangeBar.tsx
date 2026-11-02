import { MAX_NUMBER, MIN_NUMBER } from '@game/shared'

/** 1..100 track with the still-possible range highlighted. */
export function RangeBar({ low, high, mystery }: { low: number; high: number; mystery?: number }) {
  const span = MAX_NUMBER - MIN_NUMBER + 1
  const left = ((low - MIN_NUMBER) / span) * 100
  const width = ((high - low + 1) / span) * 100

  return (
    <div className="range">
      <div className="range-track">
        <div className="range-fill" style={{ left: `${left}%`, width: `${width}%` }} />
        {mystery !== undefined && (
          <div
            className="range-mystery"
            style={{ left: `${((mystery - MIN_NUMBER + 0.5) / span) * 100}%` }}
            title={`Mystery number: ${mystery}`}
          />
        )}
      </div>
      <div className="range-labels">
        <span>{MIN_NUMBER}</span>
        <span className="range-current">
          {low === high ? low : `${low} – ${high}`}
        </span>
        <span>{MAX_NUMBER}</span>
      </div>
    </div>
  )
}
