import { RED, BLACK, colorOf, typeOf, idx, rowOf, colOf, kingSq } from './board.js'

export const VAL = [0, 6000, 120, 120, 400, 900, 450, 30]

const PST_P = [
  0, 3, 6, 9, 12, 9, 6, 3, 0,
  18, 36, 56, 80, 120, 80, 56, 36, 18,
  14, 26, 42, 60, 80, 60, 42, 26, 14,
  10, 20, 30, 34, 40, 34, 30, 20, 10,
  6, 12, 18, 18, 20, 18, 18, 12, 6,
  2, 0, 8, 0, 8, 0, 8, 0, 2,
  0, 0, -2, 0, 4, 0, -2, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0
]

const PST_N = [
  4, 8, 16, 12, 4, 12, 16, 8, 4,
  4, 10, 28, 16, 8, 16, 28, 10, 4,
  12, 14, 16, 20, 18, 20, 16, 14, 12,
  8, 24, 18, 24, 20, 24, 18, 24, 8,
  6, 16, 14, 18, 16, 18, 14, 16, 6,
  4, 12, 16, 14, 12, 14, 16, 12, 4,
  2, 6, 8, 6, 10, 6, 8, 6, 2,
  4, 2, 8, 8, 4, 8, 8, 2, 4,
  0, 2, 4, 4, -2, 4, 4, 2, 0,
  0, -4, 0, 0, 0, 0, 0, -4, 0
]

const PST_R = [
  9, 9, 9, 11, 13, 11, 9, 9, 9,
  16, 16, 16, 16, 16, 16, 16, 16, 16,
  12, 12, 12, 18, 18, 18, 12, 12, 12,
  12, 18, 16, 22, 22, 22, 16, 18, 12,
  12, 14, 12, 18, 18, 18, 12, 14, 12,
  12, 16, 14, 20, 20, 20, 14, 16, 12,
  6, 10, 8, 14, 14, 14, 8, 10, 6,
  4, 8, 6, 14, 12, 14, 6, 8, 4,
  8, 4, 8, 16, 8, 16, 8, 4, 8,
  -2, 10, 6, 14, 4, 14, 6, 10, -2
]

const PST_C = [
  6, 4, 0, -10, -12, -10, 0, 4, 6,
  2, 2, 0, -4, -14, -4, 0, 2, 2,
  2, 2, 0, -10, -8, -10, 0, 2, 2,
  0, 0, -2, 4, 10, 4, -2, 0, 0,
  0, 0, 0, 2, 8, 2, 0, 0, 0,
  -2, 0, 4, 2, 6, 2, 4, 0, -2,
  0, 0, 0, 2, 4, 2, 0, 0, 0,
  4, 0, 8, 6, 10, 6, 8, 0, 4,
  0, 2, 4, 6, 6, 6, 4, 2, 0,
  0, 0, 2, 6, 6, 6, 2, 0, 0
]

const PST_B = new Int16Array(90)
PST_B[idx(9, 2)] = 3; PST_B[idx(9, 6)] = 3
PST_B[idx(7, 0)] = 2; PST_B[idx(7, 8)] = 2; PST_B[idx(7, 4)] = 6
PST_B[idx(5, 2)] = 1; PST_B[idx(5, 6)] = 1

const PST_A = new Int16Array(90)
PST_A[idx(8, 4)] = 4

const PST_K = new Int16Array(90)
PST_K[idx(9, 4)] = 6
PST_K[idx(9, 3)] = 2; PST_K[idx(9, 5)] = 2

export const PST = [null, PST_K, PST_A, PST_B, PST_N, PST_R, PST_C, PST_P]

const MIRROR = new Int8Array(90)
for (let i = 0; i < 90; i++) MIRROR[i] = idx(9 - ((i / 9) | 0), i % 9)

const HORSE_DELTAS = [
  [-2, -1, -1, 0], [-2, 1, -1, 0], [2, -1, 1, 0], [2, 1, 1, 0],
  [-1, -2, 0, -1], [1, -2, 0, -1], [-1, 2, 0, 1], [1, 2, 0, 1]
]
const ORTHO = [[-1, 0], [1, 0], [0, -1], [0, 1]]

const crossed = (row, color) => (color === RED ? row <= 4 : row >= 5)

// ---------------------------------------------------------------------------
// Local feature terms
// ---------------------------------------------------------------------------

function pawnValue(i, color) {
  const r = rowOf(i)
  if (!crossed(r, color)) return VAL[7]
  const depth = color === RED ? 4 - r : r - 5 // 0 at the bank, 4 on the back rank
  return 30 + 40 + Math.min(4, depth) * 22
}

function horseMobility(bd, sq) {
  const r = rowOf(sq), c = colOf(sq)
  let m = 0
  for (const [dr, dc, lr, lc] of HORSE_DELTAS) {
    const hr = r + dr, hc = c + dc
    if (hr < 0 || hr > 9 || hc < 0 || hc > 8) continue
    if (bd[idx(hr, hc)]) continue
    if (bd[idx(r + lr, c + lc)]) continue
    m++
  }
  return m
}

function rookMobility(bd, sq) {
  const r = rowOf(sq), c = colOf(sq)
  let open = 0
  for (const [dr, dc] of ORTHO) {
    let rr = r + dr, cc = c + dc
    while (rr >= 0 && rr < 10 && cc >= 0 && cc < 9) {
      if (bd[idx(rr, cc)]) break
      open++
      rr += dr; cc += dc
    }
  }
  return open
}

/** Value of a cannon's screens plus its ability to strike a screened target. */
function cannonQuality(bd, sq, color) {
  const r = rowOf(sq), c = colOf(sq)
  let score = 0
  for (const [dr, dc] of ORTHO) {
    let rr = r + dr, cc = c + dc, seen = 0
    while (rr >= 0 && rr < 10 && cc >= 0 && cc < 9) {
      const p = bd[idx(rr, cc)]
      if (p) {
        seen++
        if (seen === 1) {
          // own screen is useful, an enemy screen is a target we can attack
          score += colorOf(p) === color ? 6 : 14
        } else {
          if (colorOf(p) !== color && typeOf(p) >= 4) score += 20 // screened heavy piece
          break
        }
      }
      rr += dr; cc += dc
    }
  }
  return score
}

function kingExposure(bd, side) {
  const k = kingSq(bd, side)
  if (k < 0) return 0
  const opp = side ^ 1
  const r = rowOf(k), c = colOf(k)
  let pen = 0
  for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
    let rr = r + dr, cc = c + dc, seen = 0
    while (rr >= 0 && rr < 10 && cc >= 0 && cc < 9) {
      const p = bd[idx(rr, cc)]
      if (p) {
        seen++
        if (seen === 1) {
          if (colorOf(p) === opp && typeOf(p) === 5) pen += 20
        } else {
          if (colorOf(p) === opp && typeOf(p) === 6) pen += 16
          break
        }
      }
      rr += dr; cc += dc
    }
  }
  // enemy horses/cannons/pawns crowding the palace
  for (let dr = -2; dr <= 2; dr++) {
    for (let dc = -2; dc <= 2; dc++) {
      const ar = r + dr, ac = c + dc
      if (ar < 0 || ar > 9 || ac < 0 || ac > 8) continue
      const p = bd[idx(ar, ac)]
      if (!p || colorOf(p) !== opp) continue
      const t = typeOf(p)
      if (t === 4) pen += ar === r && ac === c ? 34 : 6
      else if (t === 6) pen += ar === r && ac === c ? 26 : 4
      else if (t === 7 && crossed(ar, opp)) pen += 5
    }
  }
  return pen
}

/** Classic 炮馬 (cannon + horse) coordination on an open line. */
function cannonHorseCombo(bd, sq, color) {
  const c = colOf(sq)
  let best = 0
  for (let r = 0; r < 10; r++) {
    const p = bd[idx(r, c)]
    if (!p || typeOf(p) !== 4 || colorOf(p) !== color) continue
    let gap = 0
    const lo = Math.min(r, rowOf(sq)), hi = Math.max(r, rowOf(sq))
    for (let x = lo + 1; x < hi; x++) if (bd[idx(x, c)]) { gap = 1; break }
    best = Math.max(best, gap ? 0 : 26)
  }
  return best
}

function advisorElephantCompleteness(bd, color) {
  let n = 0
  for (let i = 0; i < 90; i++) {
    const p = bd[i]
    if (p && colorOf(p) === color && (typeOf(p) === 2 || typeOf(p) === 3)) n++
  }
  return n >= 4 ? 0 : (4 - n) * -14
}

export function evaluate(bd, turn) {
  let s = 0
  let redHeavy = 0, blackHeavy = 0
  let redPawns = 0, blackPawns = 0

  for (let i = 0; i < 90; i++) {
    const p = bd[i]
    if (!p) continue
    const t = typeOf(p)
    const color = colorOf(p)
    const sign = color === RED ? 1 : -1
    const mIdx = color === RED ? i : MIRROR[i]

    let sc
    if (t === 7) {
      sc = pawnValue(i, color)
      if (color === RED) redPawns++; else blackPawns++
    } else {
      sc = VAL[t] + PST[t][mIdx]
    }

    if (t === 5) {
      if (color === RED) redHeavy++; else blackHeavy++
      sc += rookFileBonus(bd, i, color)
      sc += Math.floor(rookMobility(bd, i) / 2)
    } else if (t === 4) {
      sc += horseMobility(bd, i) * 4
      if (crossed(rowOf(i), color)) sc += 14
    } else if (t === 6) {
      if (color === RED) redHeavy++; else blackHeavy++
      sc += cannonQuality(bd, i, color)
      sc += cannonHorseCombo(bd, i, color)
    } else if (t === 2) {
      sc += 12
    } else if (t === 3) {
      sc += 6
    }

    s += sign * sc
  }

  s += advisorElephantCompleteness(bd, RED) - advisorElephantCompleteness(bd, BLACK)
  if (redHeavy > 0) s += kingExposure(bd, BLACK)
  if (blackHeavy > 0) s -= kingExposure(bd, RED)

  // Pawn race: extra crossed pawns are worth more than the raw material sum.
  s += Math.min(4, Math.max(0, redPawns - 5)) * 12
  s -= Math.min(4, Math.max(0, blackPawns - 5)) * 12

  return turn === RED ? s + 10 : -(s + 10)
}

function rookFileBonus(bd, i, color) {
  const c = colOf(i)
  let ourPawn = false, oppPawn = false
  for (let r = 0; r < 10; r++) {
    const p = bd[idx(r, c)]
    if (p && typeOf(p) === 7) {
      if (colorOf(p) === color) ourPawn = true
      else oppPawn = true
    }
  }
  if (ourPawn) return 0
  return oppPawn ? 6 : 11
}

/** Material balance in centipawn-ish units, for the review "insights" panel. */
export function materialBalance(bd) {
  const out = { [RED]: 0, [BLACK]: 0, counts: { [RED]: {}, [BLACK]: {} } }
  for (let i = 0; i < 90; i++) {
    const p = bd[i]
    if (!p) continue
    const c = colorOf(p), t = typeOf(p)
    out[c] += VAL[t]
    out.counts[c][t] = (out.counts[c][t] || 0) + 1
  }
  return out
}