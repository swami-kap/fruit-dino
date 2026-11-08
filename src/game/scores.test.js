import { describe, expect, it } from 'vitest'
import {
  chooseScoreStore,
  createLocalScoreStore,
  createRemoteScoreStore,
  loadSavedName,
  saveName,
} from './scoreStore.js'
import {
  BOARD_SIZE,
  buildBoard,
  countGames,
  isRankedWin,
  isValidName,
  isValidRecord,
  makeRecord,
  nameKey,
  normalizeName,
} from './scores.js'

const rec = (over = {}) => ({
  name: 'Sam',
  difficulty: 'medium',
  attempts: 3,
  maxAttempts: 6,
  won: true,
  at: '2026-01-01T10:00:00.000Z',
  ...over,
})

const fakeStorage = (initial = {}) => {
  const data = { ...initial }
  return {
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => void (data[k] = String(v)),
    data,
  }
}

describe('names', () => {
  it('trims and collapses whitespace', () => {
    expect(normalizeName('  Sam   K ')).toBe('Sam K')
    expect(normalizeName(42)).toBe('')
  })

  it('accepts 1 to 20 characters after trimming', () => {
    expect(isValidName('A')).toBe(true)
    expect(isValidName('a'.repeat(20))).toBe(true)
    expect(isValidName('a'.repeat(21))).toBe(false)
    expect(isValidName('   ')).toBe(false)
    expect(isValidName('')).toBe(false)
    expect(isValidName(null)).toBe(false)
  })

  it('matches players ignoring case and spacing', () => {
    expect(nameKey(' SAM  k ')).toBe(nameKey('sam k'))
  })
})

describe('records', () => {
  it('makeRecord builds a valid record with a timestamp', () => {
    const r = makeRecord({
      name: ' Sam ',
      difficulty: 'hard',
      attempts: 4,
      maxAttempts: 5,
      won: true,
      now: new Date('2026-02-03T04:05:06.000Z'),
    })
    expect(r).toEqual({
      name: 'Sam',
      difficulty: 'hard',
      attempts: 4,
      maxAttempts: 5,
      won: true,
      at: '2026-02-03T04:05:06.000Z',
    })
  })

  it('allows a null limit (Easy) and rejects bad data', () => {
    expect(isValidRecord(rec({ difficulty: 'easy', maxAttempts: null }))).toBe(true)
    expect(isValidRecord(rec({ name: '' }))).toBe(false)
    expect(isValidRecord(rec({ difficulty: 'insane' }))).toBe(false)
    expect(isValidRecord(rec({ attempts: 0 }))).toBe(false)
    expect(isValidRecord(rec({ attempts: 2.5 }))).toBe(false)
    expect(isValidRecord(rec({ maxAttempts: 21 }))).toBe(false)
    expect(isValidRecord(rec({ won: 'yes' }))).toBe(false)
    expect(isValidRecord(null)).toBe(false)
    expect(() => makeRecord({ name: '', difficulty: 'easy', attempts: 1, maxAttempts: null, won: true })).toThrow(
      RangeError,
    )
  })
})

describe('ranking rules', () => {
  it('ranks wins at the default limit only', () => {
    expect(isRankedWin(rec())).toBe(true)
    expect(isRankedWin(rec({ maxAttempts: 20 }))).toBe(false)
    expect(isRankedWin(rec({ won: false }))).toBe(false)
    expect(isRankedWin(rec({ difficulty: 'easy', maxAttempts: null }))).toBe(true)
    expect(isRankedWin(rec({ difficulty: 'hard', maxAttempts: 5 }))).toBe(true)
    expect(isRankedWin(rec({ difficulty: 'hard', maxAttempts: 6 }))).toBe(false)
  })

  it('orders by fewest attempts and keeps one best win per player', () => {
    const records = [
      rec({ name: 'Sam', attempts: 5 }),
      rec({ name: 'sam', attempts: 2, at: '2026-01-02T00:00:00.000Z' }),
      rec({ name: 'Priya', attempts: 3 }),
      rec({ name: 'Lee', attempts: 1, won: false }),
    ]
    const board = buildBoard(records, 'medium')
    expect(board.map((r) => [r.rank, r.name, r.bestAttempts])).toEqual([
      [1, 'sam', 2],
      [2, 'Priya', 3],
    ])
  })

  it('breaks ties by the earliest win', () => {
    const records = [
      rec({ name: 'Late', attempts: 3, at: '2026-03-01T00:00:00.000Z' }),
      rec({ name: 'Early', attempts: 3, at: '2026-01-01T00:00:00.000Z' }),
    ]
    expect(buildBoard(records, 'medium').map((r) => r.name)).toEqual(['Early', 'Late'])
  })

  it('keeps the earlier record when the same player ties their own best', () => {
    const records = [
      rec({ name: 'Sam', attempts: 3, at: '2026-05-01T00:00:00.000Z' }),
      rec({ name: 'Sam', attempts: 3, at: '2026-01-01T00:00:00.000Z' }),
    ]
    expect(buildBoard(records, 'medium')).toHaveLength(1)
  })

  it('counts every game in the mode, including losses and custom limits', () => {
    const records = [
      rec({ name: 'Sam', attempts: 4 }),
      rec({ name: 'Sam', attempts: 6, won: false }),
      rec({ name: 'Sam', attempts: 1, maxAttempts: 20 }),
      rec({ name: 'Sam', difficulty: 'hard', maxAttempts: 5 }),
    ]
    const [row] = buildBoard(records, 'medium')
    expect(row.bestAttempts).toBe(4)
    expect(row.gamesPlayed).toBe(3)
    expect(countGames(records, 'medium')).toBe(3)
    expect(countGames(records, 'hard')).toBe(1)
    expect(countGames(records, 'easy')).toBe(0)
  })

  it('leaves out players with no ranked win', () => {
    expect(buildBoard([rec({ won: false }), rec({ maxAttempts: 20 })], 'medium')).toEqual([])
  })

  it('shows only the top ten', () => {
    const records = Array.from({ length: 15 }, (_, i) => rec({ name: `P${i}`, attempts: (i % 6) + 1 }))
    const board = buildBoard(records, 'medium')
    expect(board).toHaveLength(BOARD_SIZE)
    expect(board.map((r) => r.rank)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
  })

  it('keeps modes separate', () => {
    const records = [rec({ difficulty: 'hard', maxAttempts: 5, name: 'Hardy' }), rec({ name: 'Medi' })]
    expect(buildBoard(records, 'hard').map((r) => r.name)).toEqual(['Hardy'])
    expect(buildBoard(records, 'medium').map((r) => r.name)).toEqual(['Medi'])
  })
})

describe('local score store', () => {
  it('starts empty and saves records', async () => {
    const store = createLocalScoreStore(fakeStorage())
    expect(await store.list()).toEqual([])
    await store.add(rec())
    await store.add(rec({ name: 'Priya' }))
    expect((await store.list()).map((r) => r.name)).toEqual(['Sam', 'Priya'])
  })

  it('rejects invalid records', async () => {
    const store = createLocalScoreStore(fakeStorage())
    await expect(store.add(rec({ attempts: 0 }))).rejects.toThrow(RangeError)
    expect(await store.list()).toEqual([])
  })

  it('ignores corrupt storage and bad rows', async () => {
    const broken = createLocalScoreStore(fakeStorage({ 'fruit-dino-scores': '{not json' }))
    expect(await broken.list()).toEqual([])
    const mixed = createLocalScoreStore(
      fakeStorage({ 'fruit-dino-scores': JSON.stringify([rec(), { name: 'x' }, 7]) }),
    )
    expect(await mixed.list()).toHaveLength(1)
  })

  it('remembers the player name and survives missing storage', () => {
    const storage = fakeStorage()
    expect(loadSavedName(storage)).toBe('')
    saveName('  Sam  ', storage)
    expect(loadSavedName(storage)).toBe('Sam')
    saveName('', storage)
    expect(loadSavedName(storage)).toBe('Sam')
    expect(loadSavedName(null)).toBe('')
    expect(() => saveName('Sam', null)).not.toThrow()
  })
})

const reply = (body, ok = true, status = 200) => ({ ok, status, json: async () => body })

describe('remote score store', () => {
  const URL = 'https://script.google.com/macros/s/ID/exec'

  it('lists valid records from the endpoint and drops bad rows', async () => {
    const calls = []
    const fetchFn = async (...args) => (calls.push(args), reply({ ok: true, records: [rec(), { name: 'x' }] }))
    const store = createRemoteScoreStore(URL, fetchFn)
    expect(await store.list()).toEqual([rec()])
    expect(calls[0][0]).toBe(URL)
  })

  it('posts one record as text/plain JSON', async () => {
    const calls = []
    const fetchFn = async (...args) => (calls.push(args), reply({ ok: true }))
    await createRemoteScoreStore(URL, fetchFn).add(rec())
    const [url, init] = calls[0]
    expect(url).toBe(URL)
    expect(init.method).toBe('POST')
    expect(init.headers['Content-Type']).toBe('text/plain;charset=utf-8')
    expect(JSON.parse(init.body)).toEqual(rec())
  })

  it('does not send an invalid record', async () => {
    let called = false
    const store = createRemoteScoreStore(URL, async () => ((called = true), reply({ ok: true })))
    await expect(store.add(rec({ attempts: 0 }))).rejects.toThrow(RangeError)
    expect(called).toBe(false)
  })

  it('throws on http errors, rejected requests and malformed replies', async () => {
    const failing = (r) => createRemoteScoreStore(URL, async () => r)
    await expect(failing(reply({}, false, 500)).list()).rejects.toThrow('500')
    await expect(failing(reply({ ok: false, error: 'nope' })).add(rec())).rejects.toThrow('nope')
    await expect(failing(reply({ ok: true })).list()).rejects.toThrow('no records')
    await expect(failing(reply(null)).list()).rejects.toThrow()
  })

  it('chooses the shared store only when a url is set', async () => {
    const local = chooseScoreStore('  ', fakeStorage())
    await local.add(rec())
    expect(await local.list()).toHaveLength(1)
    expect(await chooseScoreStore(undefined, fakeStorage()).list()).toEqual([])
  })
})
