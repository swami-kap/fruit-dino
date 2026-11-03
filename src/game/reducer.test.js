import { describe, expect, it } from 'vitest'
import { DIFFICULTIES } from './logic.js'
import { createInitialState, gameReducer } from './reducer.js'

const run = (state, ...actions) => actions.reduce(gameReducer, state)

describe('gameReducer', () => {
  it('starts idle with no attempts', () => {
    const s = createInitialState(3)
    expect(s).toMatchObject({ phase: 'idle', difficulty: 'medium', angle: 0, attempts: 0, fruitIndex: 3 })
  })

  it('SPIN adds rotation, counts the attempt and resolves the target', () => {
    // power 25 -> 3 turns + 90 degrees = 1170; net 90 -> wheel angle 270 -> segment 6
    const s = run(createInitialState(0), { type: 'SPIN', power: 25 })
    expect(s.phase).toBe('spinning')
    expect(s.angle).toBe(1170)
    expect(s.attempts).toBe(1)
    expect(s.targetIndex).toBe(6)
  })

  it('accumulates angle across attempts', () => {
    const s = run(
      createInitialState(0),
      { type: 'SPIN', power: 10 },
      { type: 'SPIN_END' },
      { type: 'EAT_END' },
      { type: 'SPIN', power: 20 },
    )
    // (1080 + 36) + (1080 + 72)
    expect(s.angle).toBe(2268)
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
    // power 10 -> net 36 -> wheel angle 324 -> segment 7; fruit is at 2
    const s = run(
      createInitialState(2),
      { type: 'SPIN', power: 10 },
      { type: 'SPIN_END' },
      { type: 'EAT_END' },
    )
    expect(s.targetIndex).toBe(7)
    expect(s.phase).toBe('idle')
    expect(s.lastResult).toBe('meat')
  })

  it('wins after eating the fruit', () => {
    // power 10 lands on segment 7
    const s = run(
      createInitialState(7),
      { type: 'SPIN', power: 10 },
      { type: 'SPIN_END' },
      { type: 'EAT_END' },
    )
    expect(s.phase).toBe('won')
    expect(s.lastResult).toBe('fruit')
    expect(s.attempts).toBe(1)
  })

  it('does not count passing over the fruit mid-spin', () => {
    // Fruit at 7. power 100 -> 4 full turns net -> segment 0. A spin passes every segment.
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
    const idle = createInitialState(7)
    expect(gameReducer(idle, { type: 'RESET', fruitIndex: 1 })).toBe(idle)
    const won = run(
      idle,
      { type: 'SPIN', power: 10 },
      { type: 'SPIN_END' },
      { type: 'EAT_END' },
    )
    expect(gameReducer(won, { type: 'RESET', fruitIndex: 1 })).toEqual(createInitialState(1))
  })
  it('resolves the target using the difficulty slice count', () => {
    // power 10 -> net 36 -> wheel angle 324
    const at = (difficulty) =>
      run(createInitialState(0, difficulty), { type: 'SPIN', power: 10 }).targetIndex
    expect(at('easy')).toBe(5) // 324 / 60
    expect(at('medium')).toBe(7) // 324 / 45
    expect(at('hard')).toBe(10) // 324 / 30
  })

  it('RESET keeps the current difficulty', () => {
    // hard, power 10 -> segment 10
    const won = run(
      createInitialState(10, 'hard'),
      { type: 'SPIN', power: 10 },
      { type: 'SPIN_END' },
      { type: 'EAT_END' },
    )
    expect(won.phase).toBe('won')
    expect(gameReducer(won, { type: 'RESET', fruitIndex: 4 })).toEqual(createInitialState(4, 'hard'))
  })

  describe('SET_DIFFICULTY', () => {
    it('resets the game with the new difficulty while idle', () => {
      const played = run(
        createInitialState(0),
        { type: 'SPIN', power: 10 },
        { type: 'SPIN_END' },
        { type: 'EAT_END' },
      )
      expect(played.attempts).toBe(1)
      const s = gameReducer(played, { type: 'SET_DIFFICULTY', difficulty: 'hard', fruitIndex: 11 })
      expect(s).toEqual(createInitialState(11, 'hard'))
    })

    it('works after a win', () => {
      const won = run(
        createInitialState(7),
        { type: 'SPIN', power: 10 },
        { type: 'SPIN_END' },
        { type: 'EAT_END' },
      )
      const s = gameReducer(won, { type: 'SET_DIFFICULTY', difficulty: 'easy', fruitIndex: 2 })
      expect(s).toEqual(createInitialState(2, 'easy'))
    })

    it('is locked while spinning or eating', () => {
      const spinning = run(createInitialState(0), { type: 'SPIN', power: 10 })
      const action = { type: 'SET_DIFFICULTY', difficulty: 'hard', fruitIndex: 0 }
      expect(gameReducer(spinning, action)).toBe(spinning)
      const eating = gameReducer(spinning, { type: 'SPIN_END' })
      expect(gameReducer(eating, action)).toBe(eating)
    })

    it('ignores unknown difficulties and the current difficulty', () => {
      const s = createInitialState(0)
      expect(gameReducer(s, { type: 'SET_DIFFICULTY', difficulty: 'nightmare', fruitIndex: 0 })).toBe(s)
      expect(gameReducer(s, { type: 'SET_DIFFICULTY', difficulty: 'medium', fruitIndex: 0 })).toBe(s)
    })

    it('rejects a fruit position outside the new wheel', () => {
      const s = createInitialState(0, 'hard')
      expect(gameReducer(s, { type: 'SET_DIFFICULTY', difficulty: 'easy', fruitIndex: 6 })).toBe(s)
      expect(gameReducer(s, { type: 'SET_DIFFICULTY', difficulty: 'easy', fruitIndex: -1 })).toBe(s)
      expect(gameReducer(s, { type: 'SET_DIFFICULTY', difficulty: 'easy', fruitIndex: 1.5 })).toBe(s)
      expect(gameReducer(s, { type: 'SET_DIFFICULTY', difficulty: 'easy', fruitIndex: 5 }).difficulty).toBe('easy')
    })

    it('every difficulty accepts all of its own fruit positions', () => {
      for (const [difficulty, { slices }] of Object.entries(DIFFICULTIES)) {
        const from = difficulty === 'medium' ? createInitialState(0, 'hard') : createInitialState(0)
        for (let i = 0; i < slices; i++) {
          const s = gameReducer(from, { type: 'SET_DIFFICULTY', difficulty, fruitIndex: i })
          expect(s.difficulty).toBe(difficulty)
          expect(s.fruitIndex).toBe(i)
        }
      }
    })
  })
  describe('limited attempts', () => {
    // power 100 -> exactly one full extra turn -> the wheel always rests on segment 0.
    // With the fruit on segment 1 these spins never win.
    const missSpin = [{ type: 'SPIN', power: 100 }, { type: 'SPIN_END' }, { type: 'EAT_END' }]
    const play = (state, spins) => run(state, ...Array.from({ length: spins }).flatMap(() => missSpin))

    it('medium allows 6 attempts, then loses', () => {
      const fifth = play(createInitialState(1, 'medium'), 5)
      expect(fifth.phase).toBe('idle')
      expect(fifth.attempts).toBe(5)
      const sixth = play(fifth, 1)
      expect(sixth.phase).toBe('lost')
      expect(sixth.attempts).toBe(6)
    })

    it('hard allows 5 attempts, then loses', () => {
      expect(play(createInitialState(1, 'hard'), 4).phase).toBe('idle')
      expect(play(createInitialState(1, 'hard'), 5).phase).toBe('lost')
    })

    it('easy never runs out of attempts', () => {
      const s = play(createInitialState(1, 'easy'), 40)
      expect(s.phase).toBe('idle')
      expect(s.attempts).toBe(40)
    })

    it('finding the fruit on the last attempt is still a win', () => {
      // 5 misses on segment 0, then power 10 (net 36) lands on segment 7.
      const state = run(
        play(createInitialState(7, 'medium'), 5),
        { type: 'SPIN', power: 10 },
        { type: 'SPIN_END' },
        { type: 'EAT_END' },
      )
      expect(state.attempts).toBe(6)
      expect(state.phase).toBe('won')
    })

    it('does not lose mid-spin; the result waits until eating finishes', () => {
      const last = run(play(createInitialState(1, 'medium'), 5), { type: 'SPIN', power: 100 })
      expect(last.attempts).toBe(6)
      expect(last.phase).toBe('spinning')
      expect(gameReducer(last, { type: 'SPIN_END' }).phase).toBe('eating')
    })

    it('ignores SPIN and EAT_END once lost', () => {
      const lost = play(createInitialState(1, 'hard'), 5)
      expect(gameReducer(lost, { type: 'SPIN', power: 10 })).toBe(lost)
      expect(gameReducer(lost, { type: 'SPIN_END' })).toBe(lost)
      expect(gameReducer(lost, { type: 'EAT_END' })).toBe(lost)
    })

    it('RESET after a loss keeps the difficulty and clears attempts', () => {
      const lost = play(createInitialState(1, 'hard'), 5)
      expect(gameReducer(lost, { type: 'RESET', fruitIndex: 3 })).toEqual(createInitialState(3, 'hard'))
    })

    it('can switch difficulty after a loss', () => {
      const lost = play(createInitialState(1, 'hard'), 5)
      const s = gameReducer(lost, { type: 'SET_DIFFICULTY', difficulty: 'easy', fruitIndex: 2 })
      expect(s).toEqual(createInitialState(2, 'easy'))
    })
  })
})
