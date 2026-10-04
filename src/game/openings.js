import { ALL_LESSONS } from '../data/lessons.js'

/**
 * Opening identification for Game Review.
 *
 * The app's own opening lessons are the primary source (they already carry
 * bilingual names); a table of classical Chinese opening names fills in the
 * gaps so that a game which leaves the lesson book still gets a label.
 */
const NAMED = [
  { moves: ['h2e2', 'h9i9'], en: 'Central Cannon (Straight Horse)', zh: '中炮對直馬' },
  { moves: ['c3c4'], en: 'Riding the Elephant (仙人指路)', zh: '仙人指路' },
  { moves: ['b0c2'], en: 'Riding Horse Opening (Corner Horse)', zh: '起馬局（士角馬）' },
  { moves: ['g0e2'], en: 'Riding Horse Opening (Central Horse)', zh: '起馬局（仙人馬）' },
  { moves: ['i0h0'], en: 'Corner Cannon Opening', zh: '士角炮局' },
  { moves: ['c0e2'], en: 'Flying Elephant Opening', zh: '飛相局' },
  { moves: ['h2e2', 'b9c7'], en: 'Central Cannon vs Palace Horse', zh: '中炮對宮角馬' }
]

/** Build the matcher once: lesson lines first (they win ties, being richer). */
const BOOK = (() => {
  const entries = []
  for (const l of ALL_LESSONS) {
    if (l.cat !== 'opening') continue
    entries.push({ moves: l.moves, en: l.titleEn, zh: l.titleZh })
  }
  entries.push(...NAMED)
  return entries.sort((a, b) => b.moves.length - a.moves.length)
})()

function commonPrefix(a, b) {
  const n = Math.min(a.length, b.length, 8)
  let i = 0
  while (i < n && a[i] === b[i]) i++
  return i
}

/**
 * @param {string[]} moves full ICCS move list
 * @param {number} humanColor RED | BLACK — kept in the signature so callers can
 *        report the opening from the player's side; these names are side-neutral.
 */
export function identifyOpening(moves, humanColor = 0) {
  void humanColor
  const list = Array.isArray(moves) ? moves : []
  if (list.length === 0) {
    return { nameEn: 'Starting Position', nameZh: '起始局面', plys: 0, fallback: true }
  }
  let best = null
  for (const entry of BOOK) {
    const plys = commonPrefix(entry.moves, list)
    if (plys < 1) continue
    if (!best || plys > best.plys) {
      best = { nameEn: entry.en, nameZh: entry.zh, plys }
    }
  }
  if (!best) {
    return { nameEn: 'Unclassified Opening', nameZh: '未分類布局', plys: Math.min(2, list.length), fallback: true }
  }
  return { nameEn: best.nameEn, nameZh: best.nameZh, plys: best.plys }
}

/**
 * First-move presets offered in Play mode. Each entry is a legal opening move
 * for Red from the start position (verified by `tests/verify-review.mjs`) and is
 * only applied when the player takes Red.
 */
export const OPENING_CHOICES = [
  { id: 'free', moves: [], en: 'Free choice', zh: '自由選擇' },
  { id: 'central-cannon', moves: ['h2e2'], en: 'Central Cannon', zh: '當頭炮' },
  { id: 'corner-cannon', moves: ['b2e2'], en: 'Corner Cannon to centre', zh: '士角炮轉中路' },
  { id: 'riding-elephant', moves: ['c3c4'], en: 'Riding Elephant', zh: '仙人指路' },
  { id: 'flying-elephant', moves: ['c0e2'], en: 'Flying Elephant', zh: '飛相局' },
  { id: 'horse-corner', moves: ['b0c2'], en: 'Corner Horse', zh: '士角馬' },
  { id: 'horse-central', moves: ['g0e2'], en: 'Central Horse', zh: '仙人馬' }
]