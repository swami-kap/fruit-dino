import { describe, expect, it } from 'vitest'
import {
  BASE_SPIN_TURNS,
  DEFAULT_SPIN_MODE,
  MAX_POWER,
  METER_PERIOD_MS,
  MIN_POWER,
  SEGMENT_COUNT,
  SPIN_MODES,
  addRotation,
  getSegmentIndex,
  meterValueAt,
  placeFruit,
  powerToRotation,
  segmentCenterAngle,
  segmentStartAngle,
} from './logic.js'

describe('powerToRotation', () => {
  it('defaults to power-landing mode', () => {
    expect(DEFAULT_SPIN_MODE).toBe(SPIN_MODES.POWER_LANDING)
    expect(powerToRotation(40)).toBe(powerToRotation(40, SPIN_MODES.POWER_LANDING))
  })

  it('linear mode maps power to 7.2 degrees per point', () => {
    expect(powerToRotation(1, SPIN_MODES.LINEAR)).toBe(7.2)
    expect(powerToRotation(50, SPIN_MODES.LINEAR)).toBe(360)
    expect(powerToRotation(100, SPIN_MODES.LINEAR)).toBe(720)
  })

  it('power-landing mode adds a fixed number of turns plus 3.6 degrees per point', () => {
    const base = BASE_SPIN_TURNS * 360
    expect(powerToRotation(1)).toBe(base + 3.6)
    expect(powerToRotation(50)).toBe(base + 180)
    expect(powerToRotation(100)).toBe(base + 360)
  })

  it('power-landing spin always looks big, regardless of power', () => {
    for (let p = MIN_POWER; p <= MAX_POWER; p++) {
      expect(powerToRotation(p)).toBeGreaterThanOrEqual(BASE_SPIN_TURNS * 360)
    }
  })

  it('power-landing net shift is power * 3.6 degrees (100 power = one full turn)', () => {
    const net = (p) => Math.round((powerToRotation(p) % 360) * 1000) / 1000
    expect(net(25)).toBe(90)
    expect(net(50)).toBe(180)
    expect(net(99)).toBe(356.4)
    expect(net(100)).toBe(0) // exactly one full turn wraps back to the start
  })

  it('rejects out-of-range and non-integer power', () => {
    expect(() => powerToRotation(0)).toThrow(RangeError)
    expect(() => powerToRotation(101)).toThrow(RangeError)
    expect(() => powerToRotation(12.5)).toThrow(RangeError)
    expect(() => powerToRotation(NaN)).toThrow(RangeError)
  })

  it('rejects an unknown mode', () => {
    expect(() => powerToRotation(10, 'bogus')).toThrow(RangeError)
  })
})

describe('getSegmentIndex', () => {
  it('returns segment 0 at the start', () => {
    expect(getSegmentIndex(0)).toBe(0)
  })

  it('walks backwards through segments as the wheel rotates clockwise', () => {
    expect(getSegmentIndex(10)).toBe(7)
    expect(getSegmentIndex(44.9)).toBe(7)
    expect(getSegmentIndex(90)).toBe(6)
    expect(getSegmentIndex(180)).toBe(4)
    expect(getSegmentIndex(315)).toBe(1)
    expect(getSegmentIndex(359.9)).toBe(0)
  })

  it('puts an exact boundary into the later (clockwise) segment', () => {
    // angle 45 -> wheel angle 315 -> start of segment 7
    expect(getSegmentIndex(45)).toBe(7)
    expect(getSegmentIndex(360)).toBe(0)
  })

  it('wraps for angles beyond one turn', () => {
    expect(getSegmentIndex(360 + 90)).toBe(getSegmentIndex(90))
    expect(getSegmentIndex(720 + 10)).toBe(getSegmentIndex(10))
  })

  it('agrees with the geometry the wheel is drawn with', () => {
    // Rotate the wheel so segment i's drawn center sits at 12 o'clock.
    for (let i = 0; i < SEGMENT_COUNT; i++) {
      const angle = 360 - segmentCenterAngle(i)
      expect(getSegmentIndex(angle)).toBe(i)
      // And its start edge also belongs to segment i.
      expect(getSegmentIndex(360 - segmentStartAngle(i))).toBe(i)
    }
  })

  it.each([
    // [mode, exact tenths of a degree one spin adds]
    [SPIN_MODES.LINEAR, (power) => power * 72],
    [SPIN_MODES.POWER_LANDING, (power) => BASE_SPIN_TURNS * 3600 + power * 36],
  ])('matches exact integer math over random cumulative spins (%s)', (mode, tenthsFor) => {
    let seed = 12345
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296
      return seed / 4294967296
    }
    for (let run = 0; run < 200; run++) {
      let angle = 0
      let tenths = 0 // exact total rotation in tenths of a degree
      for (let step = 0; step < 50; step++) {
        const power = MIN_POWER + Math.floor(rand() * MAX_POWER)
        angle = addRotation(angle, powerToRotation(power, mode))
        tenths += tenthsFor(power)
        const wheelTenths = (3600 - (tenths % 3600)) % 3600
        const expected = Math.floor(wheelTenths / 450)
        expect(getSegmentIndex(angle)).toBe(expected)
      }
    }
  })
})

describe('placeFruit', () => {
  it('stays within the wheel for any rng output', () => {
    expect(placeFruit(() => 0)).toBe(0)
    expect(placeFruit(() => 0.5)).toBe(4)
    expect(placeFruit(() => 0.9999999)).toBe(SEGMENT_COUNT - 1)
  })
})

describe('meterValueAt', () => {
  it('starts at MIN, peaks at MAX halfway, and returns to MIN', () => {
    expect(meterValueAt(0)).toBe(MIN_POWER)
    expect(meterValueAt(METER_PERIOD_MS / 2)).toBe(MAX_POWER)
    expect(meterValueAt(METER_PERIOD_MS)).toBe(MIN_POWER)
  })

  it('is symmetric around the peak', () => {
    expect(meterValueAt(500)).toBe(meterValueAt(1500))
  })

  it('always returns a valid integer power', () => {
    for (let t = 0; t < METER_PERIOD_MS * 3; t += 7) {
      const v = meterValueAt(t)
      expect(Number.isInteger(v)).toBe(true)
      expect(v).toBeGreaterThanOrEqual(MIN_POWER)
      expect(v).toBeLessThanOrEqual(MAX_POWER)
    }
  })

  it('treats negative elapsed time as zero', () => {
    expect(meterValueAt(-5)).toBe(MIN_POWER)
  })
})
