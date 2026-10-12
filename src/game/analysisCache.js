import { START_FEN, repetitionKey, parseFen } from '../engine/board.js'

const KEY = 'xqm_analysis'
const VERSION = 3
const MAX_ENTRIES = 12

/**
 * Persistent cache of engine analysis.
 *
 * Re-opening a game you already reviewed should feel instant, and a "Deep"
 * pass should not throw away the "Fast" results you already have.
 */
function readStore() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '{}')
    if (!raw || raw.version !== VERSION) return {}
    return raw.entries || {}
  } catch {
    return {}
  }
}

function writeStore(entries) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ version: VERSION, entries }))
  } catch {
    // over quota: keep only the newest two entries
    try {
      const trimmed = Object.fromEntries(Object.entries(entries).slice(0, 2))
      localStorage.setItem(KEY, JSON.stringify({ version: VERSION, entries: trimmed }))
    } catch {}
  }
}

function hashMoves(fen, moves) {
  let h1 = 0x811c9dc5, h2 = 0x01000193
  const src = `${fen}|${moves.join(',')}`
  for (let i = 0; i < src.length; i++) {
    const c = src.charCodeAt(i)
    h1 = Math.imul(h1 ^ c, 16777619) >>> 0
    h2 = (Math.imul(h2 + c, 2654435761) >>> 0) ^ (h1 >>> 7)
  }
  return (h1 >>> 0).toString(36) + (h2 >>> 0).toString(36)
}

const entryKey = (fen, moves, depth) => `${hashMoves(fen, moves)}@${depth}`

/** Number of times each position in the game occurs (threefold draw claims). */
export function repetitionCounts(fen, moves) {
  const st = parseFen(fen || START_FEN)
  const bd = st.bd
  let turn = st.turn
  const counts = [1]
  const seen = new Map([[repetitionKey(bd, turn), 1]])
  for (const s of moves || []) {
    if (typeof s !== 'string' || s.length !== 4) { counts.push(0); break }
    const from = (s.charCodeAt(0) - 97) + (9 - (s.charCodeAt(1) - 48)) * 9
    const to = (s.charCodeAt(2) - 97) + (9 - (s.charCodeAt(3) - 48)) * 9
    if (!bd[from] || bd[from] === bd[to]) { counts.push(0); break }
    bd[to] = bd[from]
    bd[from] = 0
    turn ^= 1
    const k = repetitionKey(bd, turn)
    const n = (seen.get(k) || 0) + 1
    seen.set(k, n)
    counts.push(n)
  }
  return counts
}

export function readAnalysis(fen, moves, depth) {
  const store = readStore()
  const entry = store[entryKey(fen, moves, depth)]
  if (!entry) return null
  const expected = (moves || []).length + 1
  if (!entry.results || entry.results.length !== expected || entry.results.some(r => r == null)) {
    return null
  }
  return entry
}

export function writeAnalysis(fen, moves, depth, results, meta = {}) {
  if (!results || results.some(r => r == null)) return null
  const store = readStore()
  const key = entryKey(fen, moves, depth)
  store[key] = { ts: Date.now(), depth, fen, count: moves.length, results, meta }
  const entries = Object.fromEntries(
    Object.entries(store)
      .sort((a, b) => (b[1].ts || 0) - (a[1].ts || 0))
      .slice(0, MAX_ENTRIES)
  )
  writeStore(entries)
  return entries[key]
}

export function hasAnalysis(fen, moves, depth) {
  return readAnalysis(fen, moves, depth) != null
}

/** Merge a deeper pass into the stored fast pass so nothing is wasted. */
export function mergedResults(shallow, deep, total) {
  if (!shallow && deep) return deep
  if (shallow && !deep) return shallow
  if (!shallow || !deep) return null
  const out = new Array(total)
  for (let i = 0; i < total; i++) out[i] = deep[i] || shallow[i]
  return out
}

export function clearAnalysis() {
  try { localStorage.removeItem(KEY) } catch {}
}