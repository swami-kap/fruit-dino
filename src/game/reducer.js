import {
  DEFAULT_DIFFICULTY,
  DIFFICULTIES,
  addRotation,
  getSegmentIndex,
  isOutOfAttempts,
  isValidDifficulty,
  isValidPower,
  powerToRotation,
} from './logic.js'

// phase: 'idle' | 'spinning' | 'eating' | 'won' | 'lost'
export function createInitialState(fruitIndex, difficulty = DEFAULT_DIFFICULTY) {
  return {
    phase: 'idle',
    difficulty,
    angle: 0,
    attempts: 0,
    fruitIndex,
    targetIndex: null,
    lastResult: null,
  }
}

export function gameReducer(state, action) {
  switch (action.type) {
    case 'SPIN': {
      if (state.phase !== 'idle' || !isValidPower(action.power)) return state
      const angle = addRotation(state.angle, powerToRotation(action.power))
      return {
        ...state,
        phase: 'spinning',
        angle,
        attempts: state.attempts + 1,
        targetIndex: getSegmentIndex(angle, DIFFICULTIES[state.difficulty].slices),
        lastResult: null,
      }
    }
    case 'SPIN_END': {
      if (state.phase !== 'spinning') return state
      return { ...state, phase: 'eating' }
    }
    case 'EAT_END': {
      if (state.phase !== 'eating') return state
      // Eating the fruit on the very last attempt is still a win.
      if (state.targetIndex === state.fruitIndex) {
        return { ...state, phase: 'won', lastResult: 'fruit' }
      }
      if (isOutOfAttempts(state.difficulty, state.attempts)) {
        return { ...state, phase: 'lost', lastResult: 'meat' }
      }
      return { ...state, phase: 'idle', lastResult: 'meat' }
    }
    case 'RESET': {
      if (state.phase !== 'won' && state.phase !== 'lost') return state
      return createInitialState(action.fruitIndex, state.difficulty)
    }
    case 'SET_DIFFICULTY': {
      // Locked while the wheel is spinning or the dino is eating. Switching resets the game.
      if (state.phase === 'spinning' || state.phase === 'eating') return state
      if (!isValidDifficulty(action.difficulty) || action.difficulty === state.difficulty) return state
      const { slices } = DIFFICULTIES[action.difficulty]
      if (!Number.isInteger(action.fruitIndex) || action.fruitIndex < 0 || action.fruitIndex >= slices) {
        return state
      }
      return createInitialState(action.fruitIndex, action.difficulty)
    }
    default:
      return state
  }
}
