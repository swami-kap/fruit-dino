import { useEffect, useReducer } from 'react'
import Confetti from './components/Confetti.jsx'
import Dino from './components/Dino.jsx'
import PowerMeter from './components/PowerMeter.jsx'
import Result from './components/Result.jsx'
import SetupScreen from './components/SetupScreen.jsx'
import Wheel from './components/Wheel.jsx'
import { DIFFICULTIES, EAT_MS, placeFruit } from './game/logic.js'
import { createSetupState, gameReducer } from './game/reducer.js'

export default function App() {
  const [state, dispatch] = useReducer(gameReducer, undefined, () => createSetupState())
  const { label, slices, meterPeriodMs } = DIFFICULTIES[state.difficulty]
  const { maxAttempts } = state
  const attemptsLeft = maxAttempts === null ? null : maxAttempts - state.attempts

  useEffect(() => {
    if (state.phase !== 'eating') return undefined
    const timer = setTimeout(() => dispatch({ type: 'EAT_END' }), EAT_MS)
    return () => clearTimeout(timer)
  }, [state.phase])

  if (state.phase === 'setup') {
    return (
      <main className="app">
        <SetupScreen
          initialDifficulty={state.difficulty}
          initialMaxAttempts={state.maxAttempts}
          onStart={({ difficulty, maxAttempts: limit }) =>
            dispatch({
              type: 'START_GAME',
              difficulty,
              maxAttempts: limit,
              fruitIndex: placeFruit(DIFFICULTIES[difficulty].slices),
            })
          }
        />
        <div className="ground" />
      </main>
    )
  }

  const mood =
    state.phase === 'eating' ? 'chomp' : state.phase === 'won' ? 'cheer' : state.phase === 'lost' ? 'sad' : 'idle'
  const busy = state.phase === 'spinning' || state.phase === 'eating'

  return (
    <main className="app" style={{ '--eat-ms': `${EAT_MS}ms` }}>
      <h1 className="title">🦖 Fruit Dino</h1>
      <div className="modebar">
        <span className={`modechip modechip--${state.difficulty}`}>
          {label} · {slices} slices
        </span>
        <button className="btn btn--small" onClick={() => dispatch({ type: 'SHOW_SETUP' })} disabled={busy}>
          Settings
        </button>
      </div>
      <p className={`attempts${attemptsLeft === 1 ? ' attempts--last' : ''}${state.phase === 'lost' ? ' attempts--out' : ''}`}>
        Attempts:{' '}
        <strong data-testid="attempts">
          {state.attempts}
          {maxAttempts !== null && ` / ${maxAttempts}`}
        </strong>
      </p>

      <div className="stage">
        <Dino mood={mood} />
        <Wheel
          angle={state.angle}
          phase={state.phase}
          fruitIndex={state.fruitIndex}
          targetIndex={state.targetIndex}
          segmentCount={slices}
          onSpinEnd={() => dispatch({ type: 'SPIN_END' })}
        />
      </div>

      <Result
        phase={state.phase}
        attempts={state.attempts}
        lastResult={state.lastResult}
        onPlayAgain={() => dispatch({ type: 'RESET', fruitIndex: placeFruit(slices) })}
      />

      <PowerMeter
        active={state.phase === 'idle'}
        periodMs={meterPeriodMs}
        onStop={(power) => dispatch({ type: 'SPIN', power })}
      />

      {state.phase === 'won' && <Confetti />}
      <div className="ground" />
    </main>
  )
}
