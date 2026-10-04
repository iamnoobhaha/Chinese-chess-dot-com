import { replay, sqToIccs, START_FEN, RED } from '../engine/board.js'
import { chineseMove } from './notation.js'

const GAMES_KEY = 'xqm_games'
const MAX_GAMES = 100

export function annotatedReplay(startFen, iccsList) {
  const positions = replay(startFen || START_FEN, iccsList)
  for (let j = 1; j < positions.length; j++) {
    const p = positions[j]
    p.iccs = sqToIccs(p.lastFrom) + sqToIccs(p.lastTo)
    p.chinese = chineseMove(positions[j - 1].bd, p.lastFrom, p.lastTo)
    p.moverColor = p.move.mover
  }
  positions.truncated = !!positions.truncated
  return positions
}

/** Number of plies actually replayed (guards against corrupt saved games). */
export function validMoveCount(startFen, moves) {
  return annotatedReplay(startFen, moves).length - 1
}

export function loadGames() {
  try {
    const raw = JSON.parse(localStorage.getItem(GAMES_KEY) || '[]')
    if (!Array.isArray(raw)) return []
    return raw.filter(g => g && typeof g === 'object').sort((a, b) => (b.ts || 0) - (a.ts || 0))
  } catch {
    return []
  }
}

/** Drop anything that would crash the review page before it renders. */
export function sanitizeGame(g) {
  if (!g || typeof g !== 'object') return null
  const moves = Array.isArray(g.moves)
    ? g.moves.filter(m => typeof m === 'string' && /^[a-i][0-9][a-i][0-9]$/.test(m))
    : []
  return {
    ...g,
    id: String(g.id ?? Date.now()),
    ts: Number(g.ts) || Date.now(),
    mode: g.mode === 'online' ? 'online' : 'ai',
    fen: typeof g.fen === 'string' && g.fen.length > 4 ? g.fen : START_FEN,
    result: ['win', 'loss', 'draw'].includes(g.result) ? g.result : 'draw',
    moves,
    humanColor: g.humanColor === 1 ? 1 : (g.humanColor === RED ? RED : RED)
  }
}

export function saveGame(rec) {
  const clean = sanitizeGame(rec)
  if (!clean) return null
  const games = loadGames().filter(g => g.id !== clean.id)
  games.unshift(clean)
  while (games.length > MAX_GAMES) games.pop()
  try {
    localStorage.setItem(GAMES_KEY, JSON.stringify(games))
  } catch {
    // storage full — drop the oldest half and retry once
    try { localStorage.setItem(GAMES_KEY, JSON.stringify(games.slice(0, MAX_GAMES / 2))) } catch {}
  }
  return clean
}

export function deleteGame(id) {
  localStorage.setItem(GAMES_KEY, JSON.stringify(loadGames().filter(g => g.id !== id)))
}

export function getGame(id) {
  const found = loadGames().find(g => g.id === id)
  return found ? sanitizeGame(found) : null
}