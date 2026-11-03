import { DIFFICULTIES } from '../game/logic.js'

export default function DifficultySelect({ value, disabled, onChange }) {
  return (
    <div className="difficulty" role="radiogroup" aria-label="Difficulty">
      {Object.entries(DIFFICULTIES).map(([key, { label, slices }]) => (
        <button
          key={key}
          type="button"
          role="radio"
          aria-checked={value === key}
          className={`difficulty__option difficulty__option--${key}${value === key ? ' is-active' : ''}`}
          disabled={disabled}
          onClick={() => onChange(key)}
        >
          {label}
          <small>{slices} slices</small>
        </button>
      ))}
    </div>
  )
}
