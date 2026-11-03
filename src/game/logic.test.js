import { describe, expect, it } from 'vitest'
import {
  MAX_POWER,
  METER_PERIOD_MS,
  MIN_POWER,
  SEGMENT_COUNT,
  addRotation,
  getSegmentIndex,
  meterValueAt,
  placeFruit,
  powerToRotation,
  segmentCenterAngle,
  segmentStartAngle,
} from './logic.js'

describe('powerToRotation', () => {
  it('maps power to 7.2 degrees per point', () => {
    expect(powerToRotation(1)).toBe(7.2)
    expect(powerToRotation(50)).toBe(360)
    expect(powerToRotation(100)).toBe(720)
  })

  it('rejects out-of-range and non-integer power', () => {
    expect(() => powerToRotation(0)).toThrow(RangeError)
    expect(() => powerToRotation(101)).toThrow(RangeError)
    expect(() => powerToRotation(12.5)).toThrow(RangeError)
    expect(() => powerToRotation(NaN)).toThrow(RangeError)
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

  it('matches exact integer math over random cumulative spins', () => {
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
        angle = addRotation(angle, powerToRotation(power))
        tenths += power * 72
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
