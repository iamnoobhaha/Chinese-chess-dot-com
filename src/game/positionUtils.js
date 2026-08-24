import { replay, sqToIccs } from '../engine/board.js'
import { chineseMove } from './notation.js'

export function annotatedReplay(startFen, iccsList) {
  const positions = replay(startFen, iccsList)
  for (let j = 1; j < positions.length; j++) {
    const p = positions[j]
    p.iccs = sqToIccs(p.lastFrom) + sqToIccs(p.lastTo)
    p.chinese = chineseMove(positions[j - 1].bd, p.lastFrom, p.lastTo)
  }
  return positions
}

export function loadGames() {
  try {
    return JSON.parse(localStorage.getItem('xqm_games') || '[]')
  } catch {
    return []
  }
}

export function saveGame(rec) {
  const games = loadGames()
  games.unshift(rec)
  while (games.length > 40) games.pop()
  localStorage.setItem('xqm_games', JSON.stringify(games))
}

export function getGame(id) {
  return loadGames().find(g => g.id === id)
}
