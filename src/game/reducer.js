import { addRotation, getSegmentIndex, isValidPower, powerToRotation } from './logic.js'

// phase: 'idle' | 'spinning' | 'eating' | 'won'
export function createInitialState(fruitIndex) {
  return {
    phase: 'idle',
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
        targetIndex: getSegmentIndex(angle),
        lastResult: null,
      }
    }
    case 'SPIN_END': {
      if (state.phase !== 'spinning') return state
      return { ...state, phase: 'eating' }
    }
    case 'EAT_END': {
      if (state.phase !== 'eating') return state
      if (state.targetIndex === state.fruitIndex) {
        return { ...state, phase: 'won', lastResult: 'fruit' }
      }
      return { ...state, phase: 'idle', lastResult: 'meat' }
    }
    case 'RESET': {
      if (state.phase !== 'won') return state
      return createInitialState(action.fruitIndex)
    }
    default:
      return state
  }
}
