// Score storage behind a small async interface: list() and add(record).
// This version keeps records in browser storage. A shared backend can replace it by
// returning another object with the same two methods from getScoreStore().

import { isValidName, isValidRecord, normalizeName } from './scores.js'

const SCORES_KEY = 'fruit-dino-scores'
const NAME_KEY = 'fruit-dino-name'

// Storage can be missing or throw (private windows, blocked site data).
function browserStorage() {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}

function memoryStorage() {
  const data = new Map()
  return {
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => void data.set(key, String(value)),
  }
}

export function createLocalScoreStore(storage) {
  const read = () => {
    const raw = storage.getItem(SCORES_KEY)
    if (!raw) return []
    try {
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed.filter(isValidRecord) : []
    } catch {
      return []
    }
  }
  return {
    async list() {
      return read()
    },
    async add(record) {
      if (!isValidRecord(record)) throw new RangeError('invalid score record')
      storage.setItem(SCORES_KEY, JSON.stringify([...read(), record]))
    },
  }
}

// Shared scores in a Google Sheet through an Apps Script web app (see scoreboard-apps-script/).
// POST uses text/plain so the browser sends a simple request with no CORS preflight.
// Adds ?tab=<tab> so one script can serve more than one Sheet tab (e.g. 'bug').
export function withTab(url, tab) {
  const trimmed = typeof tab === 'string' ? tab.trim() : ''
  if (!trimmed) return url
  const u = new URL(url)
  u.searchParams.set('tab', trimmed)
  return u.toString()
}

export function createRemoteScoreStore(baseUrl, fetchFn = (...args) => globalThis.fetch(...args), tab = '') {
  const url = withTab(baseUrl, tab)
  const readJson = async (res) => {
    if (!res.ok) throw new Error(`scoreboard request failed (${res.status})`)
    const data = await res.json()
    if (!data || data.ok !== true) throw new Error(data?.error ?? 'scoreboard rejected the request')
    return data
  }
  return {
    async list() {
      const data = await readJson(await fetchFn(url))
      if (!Array.isArray(data.records)) throw new Error('scoreboard returned no records')
      return data.records.filter(isValidRecord)
    },
    async add(record) {
      if (!isValidRecord(record)) throw new RangeError('invalid score record')
      await readJson(
        await fetchFn(url, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(record),
        }),
      )
    },
  }
}

// A non-empty url selects the shared store; otherwise scores stay in this browser.
export function chooseScoreStore(url, storage, tab = '') {
  const trimmed = typeof url === 'string' ? url.trim() : ''
  return trimmed
    ? createRemoteScoreStore(trimmed, undefined, tab)
    : createLocalScoreStore(storage ?? memoryStorage())
}

let store = null
export function getScoreStore() {
  if (!store) {
    const env = import.meta.env ?? {}
    store = chooseScoreStore(env.VITE_SCOREBOARD_URL, browserStorage(), env.VITE_SCOREBOARD_TAB)
  }
  return store
}

export function loadSavedName(storage = browserStorage()) {
  try {
    const name = normalizeName(storage?.getItem(NAME_KEY) ?? '')
    return isValidName(name) ? name : ''
  } catch {
    return ''
  }
}

export function saveName(name, storage = browserStorage()) {
  try {
    if (isValidName(name)) storage?.setItem(NAME_KEY, normalizeName(name))
  } catch {
    // The name is only a convenience; ignore storage failures.
  }
}
