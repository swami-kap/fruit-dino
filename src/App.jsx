import { useEffect, useReducer } from 'react'
import Confetti from './components/Confetti.jsx'
import Dino from './components/Dino.jsx'
import PowerMeter from './components/PowerMeter.jsx'
import Result from './components/Result.jsx'
import Wheel from './components/Wheel.jsx'
import { EAT_MS, placeFruit } from './game/logic.js'
import { createInitialState, gameReducer } from './game/reducer.js'

export default function App() {
  const [state, dispatch] = useReducer(gameReducer, undefined, () => createInitialState(placeFruit()))

  useEffect(() => {
    if (state.phase !== 'eating') return undefined
    const timer = setTimeout(() => dispatch({ type: 'EAT_END' }), EAT_MS)
    return () => clearTimeout(timer)
  }, [state.phase])

  const mood = state.phase === 'eating' ? 'chomp' : state.phase === 'won' ? 'cheer' : 'idle'

  return (
    <main className="app" style={{ '--eat-ms': `${EAT_MS}ms` }}>
      <h1 className="title">🦖 Fruit Dino</h1>
      <p className="attempts">
        Attempts: <strong data-testid="attempts">{state.attempts}</strong>
      </p>

      <div className="stage">
        <Dino mood={mood} />
        <Wheel
          angle={state.angle}
          phase={state.phase}
          fruitIndex={state.fruitIndex}
          targetIndex={state.targetIndex}
          onSpinEnd={() => dispatch({ type: 'SPIN_END' })}
        />
      </div>

      <Result
        phase={state.phase}
        attempts={state.attempts}
        lastResult={state.lastResult}
        onPlayAgain={() => dispatch({ type: 'RESET', fruitIndex: placeFruit() })}
      />

      <PowerMeter active={state.phase === 'idle'} onStop={(power) => dispatch({ type: 'SPIN', power })} />

      {state.phase === 'won' && <Confetti />}
      <div className="ground" />
    </main>
  )
}
