// Runs Code.gs against a fake Google Sheet so the script logic is tested without Google.
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import { beforeEach, describe, expect, it } from 'vitest'

const source = readFileSync(new URL('./Code.gs', import.meta.url), 'utf8')

function makeSheet(name) {
  const rows = []
  const sheet = {
    name,
    rows,
    formats: [],
    getLastRow: () => rows.length,
    getRange(row, col, numRows, numCols) {
      // A1 notation (e.g. 'A:C') is only used to set the number format.
      if (typeof row === 'string') return { setNumberFormat: (f) => sheet.formats.push([row, f]) }
      return {
        setValues: (vals) => void vals.forEach((v, i) => (rows[row - 1 + i] = v)),
        getValues: () => rows.slice(row - 1, row - 1 + numRows).map((r) => r.slice(col - 1, col - 1 + numCols)),
      }
    },
    setFrozenRows() {},
    appendRow: (r) => void rows.push(r),
  }
  return sheet
}

let sheets
let ctx

beforeEach(() => {
  sheets = {}
  const ss = {
    getSheetByName: (n) => sheets[n] ?? null,
    insertSheet: (n) => (sheets[n] = makeSheet(n)),
  }
  ctx = vm.createContext({
    SpreadsheetApp: { getActiveSpreadsheet: () => ss },
    ContentService: {
      MimeType: { JSON: 'json' },
      createTextOutput: (text) => ({ text, setMimeType() { return this } }),
    },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    JSON,
    Number,
    Date,
    Object,
    String,
    isNaN,
  })
  vm.runInContext(source, ctx)
})

const record = (over = {}) => ({
  name: 'Sam',
  difficulty: 'medium',
  attempts: 3,
  maxAttempts: 6,
  won: true,
  at: '2026-01-01T10:00:00.000Z',
  ...over,
})
const post = (rec, tab) => ctx.doPost({ postData: { contents: typeof rec === 'string' ? rec : JSON.stringify(rec) }, parameter: tab ? { tab } : {} })
const get = (tab) => JSON.parse(ctx.doGet({ parameter: tab ? { tab } : {} }).text)

describe('Code.gs', () => {
  it('starts empty and creates the Scores tab with a header', () => {
    expect(get()).toEqual({ ok: true, records: [] })
    expect(sheets.Scores.rows[0]).toEqual(['at', 'name', 'difficulty', 'attempts', 'maxAttempts', 'won'])
  })

  it('works when run from the editor with no event object', () => {
    expect(JSON.parse(ctx.doGet().text)).toEqual({ ok: true, records: [] })
  })

  it('stores a record and returns it', () => {
    expect(JSON.parse(post(record()).text)).toEqual({ ok: true })
    expect(get().records).toEqual([record()])
  })

  it('stores a null limit as an empty cell and reads it back as null', () => {
    post(record({ difficulty: 'easy', maxAttempts: null }))
    expect(sheets.Scores.rows[1][4]).toBe('')
    expect(get().records[0].maxAttempts).toBeNull()
  })

  it('keeps the bug tab separate from the normal tab', () => {
    post(record({ name: 'Clean' }))
    post(record({ name: 'Buggy' }), 'bug')
    expect(get().records.map((r) => r.name)).toEqual(['Clean'])
    expect(get('bug').records.map((r) => r.name)).toEqual(['Buggy'])
    expect(sheets['Scores-bug'].rows[0][0]).toBe('at')
  })

  it('rejects unknown tabs without creating them', () => {
    expect(get('evil')).toEqual({ ok: false, error: 'unknown tab' })
    expect(JSON.parse(post(record(), 'evil').text)).toEqual({ ok: false, error: 'unknown tab' })
    expect(JSON.parse(post(record(), 'constructor').text).ok).toBe(false)
    expect(Object.keys(sheets)).toEqual([])
  })

  it('rejects invalid records and bad JSON', () => {
    for (const bad of [
      record({ name: '' }),
      record({ name: 'x'.repeat(21) }),
      record({ difficulty: 'insane' }),
      record({ attempts: 0 }),
      record({ maxAttempts: 99 }),
      record({ won: 'yes' }),
      record({ at: 'not a date' }),
    ]) {
      expect(JSON.parse(post(bad).text).ok).toBe(false)
    }
    expect(JSON.parse(post('not json').text)).toEqual({ ok: false, error: 'body is not valid JSON' })
    expect(get().records).toEqual([])
  })
})
