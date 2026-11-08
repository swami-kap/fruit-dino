// Pure scoreboard logic. No React, no DOM, no storage.
//
// One record is saved per finished game. The board and "games played" are worked out
// from those records, so the rules can change later without losing data.

import { DIFFICULTIES, isValidAttemptLimit, isValidDifficulty } from './logic.js'

export const MIN_NAME_LENGTH = 1
export const MAX_NAME_LENGTH = 20
export const BOARD_SIZE = 10

// Trim and collapse inner whitespace so "  Sam   K " and "Sam K" are the same player.
export function normalizeName(raw) {
  return typeof raw === 'string' ? raw.trim().replace(/\s+/g, ' ') : ''
}

export function isValidName(raw) {
  const name = normalizeName(raw)
  return name.length >= MIN_NAME_LENGTH && name.length <= MAX_NAME_LENGTH
}

// Players are matched ignoring case.
export function nameKey(name) {
  return normalizeName(name).toLowerCase()
}

export function isValidRecord(r) {
  return (
    typeof r === 'object' &&
    r !== null &&
    isValidName(r.name) &&
    isValidDifficulty(r.difficulty) &&
    Number.isInteger(r.attempts) &&
    r.attempts >= 1 &&
    (r.maxAttempts === null || isValidAttemptLimit(r.maxAttempts)) &&
    typeof r.won === 'boolean' &&
    typeof r.at === 'string' &&
    r.at.length > 0
  )
}

export function makeRecord({ name, difficulty, attempts, maxAttempts, won, now = new Date() }) {
  const record = {
    name: normalizeName(name),
    difficulty,
    attempts,
    maxAttempts,
    won,
    at: now.toISOString(),
  }
  if (!isValidRecord(record)) throw new RangeError('invalid score record')
  return record
}

// Only wins played with the mode's default attempt limit are ranked. A player-chosen
// limit of 20 would make Hard much easier, so those games are saved but not ranked.
export function isRankedWin(record) {
  return record.won && record.maxAttempts === DIFFICULTIES[record.difficulty].defaultMaxAttempts
}

// Top rows for one mode: one best win per player (fewest attempts, earliest win on a tie),
// ordered best first. gamesPlayed counts every game the player saved in this mode.
export function buildBoard(records, difficulty, limit = BOARD_SIZE) {
  const games = new Map()
  const best = new Map()
  for (const r of records) {
    if (r.difficulty !== difficulty) continue
    const key = nameKey(r.name)
    games.set(key, (games.get(key) ?? 0) + 1)
    if (!isRankedWin(r)) continue
    const current = best.get(key)
    if (!current || r.attempts < current.attempts || (r.attempts === current.attempts && r.at < current.at)) {
      best.set(key, r)
    }
  }
  return [...best.entries()]
    .sort(([, a], [, b]) => a.attempts - b.attempts || (a.at < b.at ? -1 : a.at > b.at ? 1 : 0))
    .slice(0, limit)
    .map(([key, r], i) => ({
      rank: i + 1,
      name: r.name,
      bestAttempts: r.attempts,
      gamesPlayed: games.get(key),
    }))
}

// Every game saved in one mode, for the "games played" total.
export function countGames(records, difficulty) {
  return records.filter((r) => r.difficulty === difficulty).length
}
