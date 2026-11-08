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

let store = null
export function getScoreStore() {
  if (!store) store = createLocalScoreStore(browserStorage() ?? memoryStorage())
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
