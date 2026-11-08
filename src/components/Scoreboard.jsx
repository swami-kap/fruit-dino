import { useEffect, useState } from 'react'
import { DIFFICULTIES } from '../game/logic.js'
import { buildBoard, countGames } from '../game/scores.js'
import DifficultySelect from './DifficultySelect.jsx'

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`

export default function Scoreboard({ initialDifficulty, store, onBack }) {
  const [difficulty, setDifficulty] = useState(initialDifficulty)
  const [status, setStatus] = useState('loading') // 'loading' | 'ready' | 'error'
  const [records, setRecords] = useState([])
  const [reloads, setReloads] = useState(0)

  useEffect(() => {
    let cancelled = false
    setStatus('loading')
    store.list().then(
      (list) => {
        if (cancelled) return
        setRecords(list)
        setStatus('ready')
      },
      () => {
        if (!cancelled) setStatus('error')
      },
    )
    return () => {
      cancelled = true
    }
  }, [store, reloads])

  const { label, defaultMaxAttempts } = DIFFICULTIES[difficulty]
  const rows = buildBoard(records, difficulty)
  const rule =
    defaultMaxAttempts === null
      ? `${label}: all wins are ranked.`
      : `${label}: only wins with the default limit of ${defaultMaxAttempts} attempts are ranked.`

  return (
    <section className="setup board">
      <h1 className="title">🏆 Scoreboard</h1>
      <DifficultySelect value={difficulty} disabled={false} onChange={setDifficulty} />
      <p className="setup__details">{rule}</p>

      {status === 'loading' && <p className="board__note">Loading scores...</p>}

      {status === 'error' && (
        <div className="board__note board__note--error">
          <p>Could not load the scores.</p>
          <button className="btn btn--small" type="button" onClick={() => setReloads((n) => n + 1)}>
            Try again
          </button>
        </div>
      )}

      {status === 'ready' &&
        (rows.length === 0 ? (
          <p className="board__note" data-testid="board-empty">
            No ranked wins yet. Be the first!
          </p>
        ) : (
          <table className="board__table" data-testid="board-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Player</th>
                <th>Best win</th>
                <th>Games</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.name.toLowerCase()}>
                  <td>{row.rank}</td>
                  <td>{row.name}</td>
                  <td>{plural(row.bestAttempts, 'attempt')}</td>
                  <td>{row.gamesPlayed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ))}

      {status === 'ready' && (
        <p className="board__total">{plural(countGames(records, difficulty), 'game')} played in this mode</p>
      )}

      <button className="btn btn--small" type="button" onClick={onBack}>
        Back
      </button>
    </section>
  )
}
