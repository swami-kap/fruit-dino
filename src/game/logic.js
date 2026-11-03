// Pure game logic. No React, no DOM, no timers.
//
// Geometry: the wheel has SEGMENT_COUNT equal segments. In the wheel's own
// frame, segment i spans [i * SEGMENT_ANGLE, (i + 1) * SEGMENT_ANGLE) degrees,
// measured clockwise from 12 o'clock. The dino sits at 12 o'clock. When the
// wheel has rotated `angle` degrees clockwise, the wheel-frame angle under the
// dino's mouth is (360 - angle) mod 360.

export const SEGMENT_COUNT = 8
export const SEGMENT_ANGLE = 360 / SEGMENT_COUNT

export const MIN_POWER = 1
export const MAX_POWER = 100

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

export const METER_PERIOD_MS = 2000
export const SPIN_MS = 3000
export const EAT_MS = 1500

const round3 = (n) => Math.round(n * 1000) / 1000

export function normalizeAngle(angle) {
  return ((angle % 360) + 360) % 360
}

export function segmentStartAngle(index) {
  return index * SEGMENT_ANGLE
}

export function segmentCenterAngle(index) {
  return index * SEGMENT_ANGLE + SEGMENT_ANGLE / 2
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
export function getSegmentIndex(angle) {
  const wheelAngle = normalizeAngle(360 - normalizeAngle(round3(angle)))
  return Math.floor(wheelAngle / SEGMENT_ANGLE)
}

export function placeFruit(rng = Math.random) {
  return Math.min(SEGMENT_COUNT - 1, Math.floor(rng() * SEGMENT_COUNT))
}

// Triangle wave: MIN_POWER -> MAX_POWER -> MIN_POWER over METER_PERIOD_MS.
export function meterValueAt(elapsedMs) {
  const t = Math.max(0, elapsedMs)
  const phase = (t % METER_PERIOD_MS) / METER_PERIOD_MS
  const triangle = phase < 0.5 ? phase * 2 : 2 - phase * 2
  return Math.round(MIN_POWER + triangle * (MAX_POWER - MIN_POWER))
}
