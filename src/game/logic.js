// Pure game logic. No React, no DOM, no timers.
//
// Geometry: the wheel has `count` equal segments (set by the difficulty). In the
// wheel's own frame, segment i spans [i * segmentAngle(count), (i + 1) * segmentAngle(count))
// degrees, measured clockwise from 12 o'clock. The dino sits at 12 o'clock. When the
// wheel has rotated `angle` degrees clockwise, the wheel-frame angle under the
// dino's mouth is (360 - angle) mod 360.

export const MIN_POWER = 1
export const MAX_POWER = 100

// Difficulty: more slices means a smaller fruit target; a faster meter makes the
// power harder to time. defaultMaxAttempts is the prefilled attempt limit on the setup
// screen (null = unlimited, and the player cannot set a limit for that mode).
export const DIFFICULTIES = {
  easy: { label: 'Easy', slices: 6, meterPeriodMs: 3000, defaultMaxAttempts: null },
  medium: { label: 'Medium', slices: 8, meterPeriodMs: 2000, defaultMaxAttempts: 6 },
  hard: { label: 'Hard', slices: 12, meterPeriodMs: 1000, defaultMaxAttempts: 5 },
}
export const DEFAULT_DIFFICULTY = 'medium'

// Range the player may choose for the attempt limit on limited modes.
export const MIN_ATTEMPT_LIMIT = 1
export const MAX_ATTEMPT_LIMIT = 20

// Spin modes: how a locked power value turns into wheel rotation.
//  'linear'        rotation = power * DEGREES_PER_POWER. Spin length follows power.
//  'power-landing' rotation = BASE_SPIN_TURNS full turns + power * LANDING_DEGREES_PER_POWER.
//                  The spin always looks the same; only where it stops depends on power
//                  (50 power = half a turn of net shift, 100 power = one full turn).
export const SPIN_MODES = { LINEAR: 'linear', POWER_LANDING: 'power-landing' }
export const DEFAULT_SPIN_MODE = SPIN_MODES.POWER_LANDING

export const DEGREES_PER_POWER = 7.2
export const LANDING_DEGREES_PER_POWER = 3.6
export const BASE_SPIN_TURNS = 3

export const SPIN_MS = 3000
export const EAT_MS = 1500

const round3 = (n) => Math.round(n * 1000) / 1000

export function isValidDifficulty(key) {
  return typeof key === 'string' && Object.hasOwn(DIFFICULTIES, key)
}

export function getDifficulty(key) {
  if (!isValidDifficulty(key)) throw new RangeError(`unknown difficulty: ${key}`)
  return DIFFICULTIES[key]
}

export function isValidAttemptLimit(limit) {
  return Number.isInteger(limit) && limit >= MIN_ATTEMPT_LIMIT && limit <= MAX_ATTEMPT_LIMIT
}

// True once every allowed attempt has been used. maxAttempts null means unlimited.
export function isOutOfAttempts(maxAttempts, attempts) {
  return maxAttempts !== null && attempts >= maxAttempts
}

export function normalizeAngle(angle) {
  return ((angle % 360) + 360) % 360
}

export function segmentAngle(count) {
  return 360 / count
}

export function segmentStartAngle(index, count) {
  return index * segmentAngle(count)
}

export function segmentCenterAngle(index, count) {
  return index * segmentAngle(count) + segmentAngle(count) / 2
}

export function isValidPower(power) {
  return Number.isInteger(power) && power >= MIN_POWER && power <= MAX_POWER
}

export function powerToRotation(power, mode = DEFAULT_SPIN_MODE) {
  if (!isValidPower(power)) {
    throw new RangeError(`power must be an integer from ${MIN_POWER} to ${MAX_POWER}`)
  }
  switch (mode) {
    case SPIN_MODES.LINEAR:
      return round3(power * DEGREES_PER_POWER)
    case SPIN_MODES.POWER_LANDING:
      return round3(BASE_SPIN_TURNS * 360 + power * LANDING_DEGREES_PER_POWER)
    default:
      throw new RangeError(`unknown spin mode: ${mode}`)
  }
}

// Angles accumulate without wrapping so the CSS transition always spins forward.
export function addRotation(angle, rotation) {
  return round3(angle + rotation)
}

// Which segment is in front of the dino's mouth for a given wheel rotation.
export function getSegmentIndex(angle, count) {
  const wheelAngle = normalizeAngle(360 - normalizeAngle(round3(angle)))
  return Math.floor(wheelAngle / segmentAngle(count))
}

export function placeFruit(count, rng = Math.random) {
  return Math.min(count - 1, Math.floor(rng() * count))
}

// Triangle wave: MIN_POWER -> MAX_POWER -> MIN_POWER over periodMs.
export function meterValueAt(elapsedMs, periodMs) {
  const t = Math.max(0, elapsedMs)
  const phase = (t % periodMs) / periodMs
  const triangle = phase < 0.5 ? phase * 2 : 2 - phase * 2
  return Math.round(MIN_POWER + triangle * (MAX_POWER - MIN_POWER))
}
