import { describe, expect, it } from 'vitest'
import { DIFFICULTIES } from './logic.js'
import { createInitialState, createSetupState, gameReducer } from './reducer.js'

const run = (state, ...actions) => actions.reduce(gameReducer, state)

describe('gameReducer', () => {
  it('starts idle with no attempts', () => {
    const s = createInitialState(3)
    expect(s).toMatchObject({
      phase: 'idle',
      difficulty: 'medium',
      maxAttempts: 6,
      angle: 0,
      attempts: 0,
      fruitIndex: 3,
    })
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

    it('can return to setup after a loss, keeping the settings', () => {
      const lost = play(createInitialState(1, 'hard'), 5)
      expect(gameReducer(lost, { type: 'SHOW_SETUP' })).toEqual(createSetupState('hard', 5))
    })
  })
  describe('setup screen', () => {
    it('starts in setup with the default difficulty and its default limit', () => {
      expect(createSetupState()).toMatchObject({ phase: 'setup', difficulty: 'medium', maxAttempts: 6 })
      expect(createSetupState('hard')).toMatchObject({ difficulty: 'hard', maxAttempts: 5 })
      expect(createSetupState('easy')).toMatchObject({ difficulty: 'easy', maxAttempts: null })
    })

    it('ignores game actions during setup', () => {
      const s = createSetupState()
      for (const action of [
        { type: 'SPIN', power: 10 },
        { type: 'SPIN_END' },
        { type: 'EAT_END' },
        { type: 'RESET', fruitIndex: 1 },
      ]) {
        expect(gameReducer(s, action)).toBe(s)
      }
    })

    it('START_GAME begins a game with the chosen difficulty and limit', () => {
      const s = gameReducer(createSetupState(), {
        type: 'START_GAME',
        difficulty: 'hard',
        maxAttempts: 9,
        fruitIndex: 4,
      })
      expect(s).toEqual(createInitialState(4, 'hard', 9))
    })

    it('START_GAME on easy ignores any limit and stays unlimited', () => {
      const s = gameReducer(createSetupState(), {
        type: 'START_GAME',
        difficulty: 'easy',
        maxAttempts: 3,
        fruitIndex: 2,
      })
      expect(s.maxAttempts).toBeNull()
      expect(s.difficulty).toBe('easy')
    })

    it('START_GAME rejects invalid limits, difficulties and fruit positions', () => {
      const setup = createSetupState()
      const ok = { type: 'START_GAME', difficulty: 'medium', maxAttempts: 6, fruitIndex: 1 }
      expect(gameReducer(setup, ok).phase).toBe('idle')
      for (const bad of [
        { maxAttempts: 0 },
        { maxAttempts: 21 },
        { maxAttempts: 2.5 },
        { maxAttempts: NaN },
        { maxAttempts: '6' },
        { maxAttempts: null },
        { difficulty: 'nightmare' },
        { fruitIndex: 8 }, // medium has segments 0..7
        { fruitIndex: -1 },
        { fruitIndex: 1.5 },
      ]) {
        expect(gameReducer(setup, { ...ok, ...bad })).toBe(setup)
      }
    })

    it('START_GAME only works from setup', () => {
      const playing = createInitialState(1)
      expect(
        gameReducer(playing, { type: 'START_GAME', difficulty: 'hard', maxAttempts: 5, fruitIndex: 1 }),
      ).toBe(playing)
    })

    it('every difficulty accepts all of its own fruit positions', () => {
      for (const [difficulty, { slices }] of Object.entries(DIFFICULTIES)) {
        for (let i = 0; i < slices; i++) {
          const s = gameReducer(createSetupState(), { type: 'START_GAME', difficulty, maxAttempts: 4, fruitIndex: i })
          expect(s.phase).toBe('idle')
          expect(s.fruitIndex).toBe(i)
        }
      }
    })

    it('SHOW_SETUP returns to setup from idle, won and lost, keeping the settings', () => {
      const idle = createInitialState(1, 'hard', 9)
      expect(gameReducer(idle, { type: 'SHOW_SETUP' })).toEqual(createSetupState('hard', 9))
      const won = run(
        createInitialState(7, 'medium', 3),
        { type: 'SPIN', power: 10 },
        { type: 'SPIN_END' },
        { type: 'EAT_END' },
      )
      expect(won.phase).toBe('won')
      expect(gameReducer(won, { type: 'SHOW_SETUP' })).toEqual(createSetupState('medium', 3))
    })

    it('SHOW_SETUP is locked while spinning or eating', () => {
      const spinning = run(createInitialState(0), { type: 'SPIN', power: 10 })
      expect(gameReducer(spinning, { type: 'SHOW_SETUP' })).toBe(spinning)
      const eating = gameReducer(spinning, { type: 'SPIN_END' })
      expect(gameReducer(eating, { type: 'SHOW_SETUP' })).toBe(eating)
    })

    it('SHOW_SETUP does nothing when already in setup', () => {
      const s = createSetupState()
      expect(gameReducer(s, { type: 'SHOW_SETUP' })).toBe(s)
    })
  })

  describe('player-chosen limit', () => {
    const miss = [{ type: 'SPIN', power: 100 }, { type: 'SPIN_END' }, { type: 'EAT_END' }]
    const play = (state, spins) => run(state, ...Array.from({ length: spins }).flatMap(() => miss))

    it('a custom limit of 2 loses after two misses', () => {
      const start = createInitialState(1, 'medium', 2)
      expect(play(start, 1).phase).toBe('idle')
      expect(play(start, 2).phase).toBe('lost')
    })

    it('a custom limit of 1 loses after the first miss', () => {
      expect(play(createInitialState(1, 'hard', 1), 1).phase).toBe('lost')
    })

    it('a high custom limit keeps the game going past the default', () => {
      const s = play(createInitialState(1, 'medium', 20), 8)
      expect(s.phase).toBe('idle')
      expect(s.attempts).toBe(8)
    })

    it('RESET and a later win keep the custom limit', () => {
      const lost = play(createInitialState(1, 'medium', 2), 2)
      expect(gameReducer(lost, { type: 'RESET', fruitIndex: 5 })).toEqual(createInitialState(5, 'medium', 2))
    })
  })
})
