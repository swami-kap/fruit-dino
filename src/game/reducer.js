import {
  DEFAULT_DIFFICULTY,
  DIFFICULTIES,
  addRotation,
  getSegmentIndex,
  isOutOfAttempts,
  isValidAttemptLimit,
  isValidDifficulty,
  isValidPower,
  powerToRotation,
} from './logic.js'

// phase: 'setup' | 'idle' | 'spinning' | 'eating' | 'won' | 'lost'
// maxAttempts: number of attempts allowed, or null for unlimited.
export function createInitialState(
  fruitIndex,
  difficulty = DEFAULT_DIFFICULTY,
  maxAttempts = DIFFICULTIES[difficulty].defaultMaxAttempts,
) {
  return {
    phase: 'idle',
    difficulty,
    maxAttempts,
    angle: 0,
    attempts: 0,
    fruitIndex,
    targetIndex: null,
    lastResult: null,
  }
}

// The screen shown before a game starts. It carries the settings used to prefill the form.
export function createSetupState(
  difficulty = DEFAULT_DIFFICULTY,
  maxAttempts = DIFFICULTIES[difficulty].defaultMaxAttempts,
) {
  return { ...createInitialState(null, difficulty, maxAttempts), phase: 'setup' }
}

export function gameReducer(state, action) {
  switch (action.type) {
    case 'START_GAME': {
      if (state.phase !== 'setup' || !isValidDifficulty(action.difficulty)) return state
      const { slices, defaultMaxAttempts } = DIFFICULTIES[action.difficulty]
      // Modes without a default limit are unlimited; the player cannot set one.
      // Limited modes need a valid whole-number limit (null is not allowed).
      const limited = defaultMaxAttempts !== null
      if (limited && !isValidAttemptLimit(action.maxAttempts)) return state
      const maxAttempts = limited ? action.maxAttempts : null
      if (!Number.isInteger(action.fruitIndex) || action.fruitIndex < 0 || action.fruitIndex >= slices) {
        return state
      }
      return createInitialState(action.fruitIndex, action.difficulty, maxAttempts)
    }
    case 'SHOW_SETUP': {
      // Not while the wheel is spinning or the dino is eating.
      if (state.phase === 'spinning' || state.phase === 'eating' || state.phase === 'setup') return state
      return createSetupState(state.difficulty, state.maxAttempts)
    }
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
      if (isOutOfAttempts(state.maxAttempts, state.attempts)) {
        return { ...state, phase: 'lost', lastResult: 'meat' }
      }
      return { ...state, phase: 'idle', lastResult: 'meat' }
    }
    case 'RESET': {
      if (state.phase !== 'won' && state.phase !== 'lost') return state
      return createInitialState(action.fruitIndex, state.difficulty, state.maxAttempts)
    }
    default:
      return state
  }
}
