import { describe, expect, it } from 'vitest'
import { createInitialState, gameReducer } from './reducer.js'

const run = (state, ...actions) => actions.reduce(gameReducer, state)

describe('gameReducer', () => {
  it('starts idle with no attempts', () => {
    const s = createInitialState(3)
    expect(s).toMatchObject({ phase: 'idle', angle: 0, attempts: 0, fruitIndex: 3 })
  })

  it('SPIN adds rotation, counts the attempt and resolves the target', () => {
    const s = run(createInitialState(0), { type: 'SPIN', power: 25 })
    expect(s.phase).toBe('spinning')
    expect(s.angle).toBe(180)
    expect(s.attempts).toBe(1)
    expect(s.targetIndex).toBe(4)
  })

  it('accumulates angle across attempts', () => {
    const s = run(
      createInitialState(0),
      { type: 'SPIN', power: 10 },
      { type: 'SPIN_END' },
      { type: 'EAT_END' },
      { type: 'SPIN', power: 20 },
    )
    expect(s.angle).toBe(216)
    expect(s.attempts).toBe(2)
  })

  it('ignores SPIN unless idle', () => {
    const spinning = run(createInitialState(0), { type: 'SPIN', power: 10 })
    expect(gameReducer(spinning, { type: 'SPIN', power: 50 })).toBe(spinning)
    const eating = gameReducer(spinning, { type: 'SPIN_END' })
    expect(gameReducer(eating, { type: 'SPIN', power: 50 })).toBe(eating)
  })

  it('ignores invalid power', () => {
    const s = createInitialState(0)
    expect(gameReducer(s, { type: 'SPIN', power: 0 })).toBe(s)
    expect(gameReducer(s, { type: 'SPIN', power: 101 })).toBe(s)
    expect(gameReducer(s, { type: 'SPIN', power: 1.5 })).toBe(s)
  })

  it('moves spinning -> eating on SPIN_END and ignores it otherwise', () => {
    const idle = createInitialState(0)
    expect(gameReducer(idle, { type: 'SPIN_END' })).toBe(idle)
    const s = run(idle, { type: 'SPIN', power: 10 }, { type: 'SPIN_END' })
    expect(s.phase).toBe('eating')
  })

  it('returns to idle after eating meat', () => {
    // power 10 -> angle 72 -> wheel angle 288 -> segment 6; fruit is at 2
    const s = run(
      createInitialState(2),
      { type: 'SPIN', power: 10 },
      { type: 'SPIN_END' },
      { type: 'EAT_END' },
    )
    expect(s.targetIndex).toBe(6)
    expect(s.phase).toBe('idle')
    expect(s.lastResult).toBe('meat')
  })

  it('wins after eating the fruit', () => {
    // power 10 lands on segment 6
    const s = run(
      createInitialState(6),
      { type: 'SPIN', power: 10 },
      { type: 'SPIN_END' },
      { type: 'EAT_END' },
    )
    expect(s.phase).toBe('won')
    expect(s.lastResult).toBe('fruit')
    expect(s.attempts).toBe(1)
  })

  it('does not count passing over the fruit mid-spin', () => {
    // Fruit at 7. power 100 -> 720 -> segment 0. A full spin passes every segment.
    const s = run(
      createInitialState(7),
      { type: 'SPIN', power: 100 },
      { type: 'SPIN_END' },
      { type: 'EAT_END' },
    )
    expect(s.targetIndex).toBe(0)
    expect(s.phase).toBe('idle')
  })

  it('ignores EAT_END unless eating', () => {
    const s = createInitialState(0)
    expect(gameReducer(s, { type: 'EAT_END' })).toBe(s)
  })

  it('RESET only works after a win and restores a fresh game', () => {
    const idle = createInitialState(6)
    expect(gameReducer(idle, { type: 'RESET', fruitIndex: 1 })).toBe(idle)
    const won = run(
      idle,
      { type: 'SPIN', power: 10 },
      { type: 'SPIN_END' },
      { type: 'EAT_END' },
    )
    expect(gameReducer(won, { type: 'RESET', fruitIndex: 1 })).toEqual(createInitialState(1))
  })
})
