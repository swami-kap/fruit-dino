import { useState } from 'react'
import {
  DIFFICULTIES,
  MAX_ATTEMPT_LIMIT,
  MIN_ATTEMPT_LIMIT,
  isValidAttemptLimit,
} from '../game/logic.js'
import DifficultySelect from './DifficultySelect.jsx'

const limitTextFor = (difficulty, maxAttempts) => {
  if (maxAttempts !== null) return String(maxAttempts)
  const fallback = DIFFICULTIES[difficulty].defaultMaxAttempts
  return fallback === null ? '' : String(fallback)
}

export default function SetupScreen({ initialDifficulty, initialMaxAttempts, onStart }) {
  const [difficulty, setDifficulty] = useState(initialDifficulty)
  const [limitText, setLimitText] = useState(limitTextFor(initialDifficulty, initialMaxAttempts))

  const { label, slices, meterPeriodMs, defaultMaxAttempts } = DIFFICULTIES[difficulty]
  const limited = defaultMaxAttempts !== null
  const parsed = limitText.trim() === '' ? NaN : Number(limitText)
  const valid = !limited || isValidAttemptLimit(parsed)

  const handleDifficulty = (next) => {
    setDifficulty(next)
    setLimitText(limitTextFor(next, null))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!valid) return
    onStart({ difficulty, maxAttempts: limited ? parsed : null })
  }

  return (
    <form className="setup" onSubmit={handleSubmit}>
      <h1 className="title">🦖 Fruit Dino</h1>
      <p className="setup__intro">Set the power, spin the wheel and feed the dino the fruit.</p>

      <DifficultySelect value={difficulty} disabled={false} onChange={handleDifficulty} />
      <p className="setup__details">
        {label}: {slices} slices, power meter sweeps every {meterPeriodMs / 1000} s
      </p>

      {limited ? (
        <label className="setup__field">
          <span>Attempts allowed</span>
          <input
            type="number"
            inputMode="numeric"
            min={MIN_ATTEMPT_LIMIT}
            max={MAX_ATTEMPT_LIMIT}
            step={1}
            value={limitText}
            onChange={(e) => setLimitText(e.target.value)}
            aria-invalid={!valid}
            data-testid="attempt-limit"
          />
          <small className={valid ? '' : 'setup__error'}>
            {valid
              ? `${MIN_ATTEMPT_LIMIT} to ${MAX_ATTEMPT_LIMIT} (default ${defaultMaxAttempts})`
              : `Enter a whole number from ${MIN_ATTEMPT_LIMIT} to ${MAX_ATTEMPT_LIMIT}`}
          </small>
        </label>
      ) : (
        <p className="setup__field setup__field--note">Unlimited attempts on {label}.</p>
      )}

      <button className="btn btn--play" type="submit" disabled={!valid}>
        Play game
      </button>
    </form>
  )
}
