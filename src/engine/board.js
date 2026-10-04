export const RED = 0
export const BLACK = 1
export const EMPTY = 0

export const START_FEN = 'rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR w'

export const idx = (r, c) => r * 9 + c
export const rowOf = i => (i / 9) | 0
export const colOf = i => i % 9
export const inBoard = (r, c) => r >= 0 && r < 10 && c >= 0 && c < 9

export const typeOf = p => p & 7
export const colorOf = p => p >> 3

const FEN_MAP = { k: 9, a: 10, b: 11, n: 12, r: 13, c: 14, p: 15, K: 1, A: 2, B: 3, N: 4, R: 5, C: 6, P: 7 }
const FEN_LETTERS = '.KABNRCP'

export function inPalace(r, c, color) {
  if (c < 3 || c > 5) return false
  return color === RED ? r >= 7 : r <= 2
}

export function parseFen(fen) {
  const parts = fen.trim().split(/\s+/)
  const bd = new Int8Array(90)
  let r = 0, c = 0
  for (const ch of parts[0]) {
    if (ch === '/') { r++; c = 0 }
    else if (ch >= '0' && ch <= '9') c += +ch
    else { bd[idx(r, c)] = FEN_MAP[ch]; c++ }
  }
  return { bd, turn: parts[1] === 'b' ? BLACK : RED }
}

export function toFen(bd, turn) {
  let out = ''
  for (let r = 0; r < 10; r++) {
    let run = 0
    for (let c = 0; c < 9; c++) {
      const p = bd[idx(r, c)]
      if (!p) { run++; continue }
      if (run) { out += run; run = 0 }
      const t = typeOf(p)
      out += colorOf(p) === RED ? FEN_LETTERS[t] : FEN_LETTERS[t].toLowerCase()
    }
    if (run) out += run
    if (r < 9) out += '/'
  }
  return out + (turn === RED ? ' w' : ' b')
}

export function kingSq(bd, color) {
  const target = color === RED ? 1 : 9
  for (let i = 0; i < 90; i++) if (bd[i] === target) return i
  return -1
}

export function generateMoves(bd, turn) {
  const moves = []
  for (let from = 0; from < 90; from++) {
    const p = bd[from]
    if (!p || colorOf(p) !== turn) continue
    const t = typeOf(p)
    const r = rowOf(from), c = colOf(from)
    const push = (rr, cc) => {
      if (!inBoard(rr, cc)) return
      const q = bd[idx(rr, cc)]
      if (!q || colorOf(q) !== turn) moves.push((from << 8) | idx(rr, cc))
    }
    if (t === 1) {
      for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        const rr = r + dr, cc = c + dc
        if (inPalace(rr, cc, turn)) push(rr, cc)
      }
    } else if (t === 2) {
      for (const [dr, dc] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) {
        const rr = r + dr, cc = c + dc
        if (inPalace(rr, cc, turn)) push(rr, cc)
      }
    } else if (t === 3) {
      for (const [dr, dc] of [[-2, -2], [-2, 2], [2, -2], [2, 2]]) {
        const rr = r + dr, cc = c + dc
        if (!inBoard(rr, cc)) continue
        if (turn === RED ? rr < 5 : rr > 4) continue
        if (bd[idx(r + dr / 2, c + dc / 2)]) continue
        push(rr, cc)
      }
    } else if (t === 4) {
      const H = [
        [-2, -1, -1, 0], [-2, 1, -1, 0], [2, -1, 1, 0], [2, 1, 1, 0],
        [-1, -2, 0, -1], [1, -2, 0, -1], [-1, 2, 0, 1], [1, 2, 0, 1]
      ]
      for (const [dr, dc, lr, lc] of H) {
        const rr = r + dr, cc = c + dc
        if (!inBoard(rr, cc)) continue
        if (bd[idx(r + lr, c + lc)]) continue
        push(rr, cc)
      }
    } else if (t === 5) {
      for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        let rr = r + dr, cc = c + dc
        while (inBoard(rr, cc)) {
          const to = idx(rr, cc), q = bd[to]
          if (!q) moves.push((from << 8) | to)
          else { if (colorOf(q) !== turn) moves.push((from << 8) | to); break }
          rr += dr; cc += dc
        }
      }
    } else if (t === 6) {
      for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        let rr = r + dr, cc = c + dc, jumped = false
        while (inBoard(rr, cc)) {
          const to = idx(rr, cc), q = bd[to]
          if (!jumped) {
            if (!q) moves.push((from << 8) | to)
            else jumped = true
          } else if (q) {
            if (colorOf(q) !== turn) moves.push((from << 8) | to)
            break
          }
          rr += dr; cc += dc
        }
      }
    } else {
      const f = turn === RED ? -1 : 1
      push(r + f, c)
      const crossed = turn === RED ? r <= 4 : r >= 5
      if (crossed) { push(r, c - 1); push(r, c + 1) }
    }
  }
  return moves
}

const KNIGHT_DELTAS = [[-2, -1], [-2, 1], [2, -1], [2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2]]

/** Has a point crossed the river for the given colour? Red advances towards row 0. */
export function crossedRiver(row, color) {
  return color === RED ? row <= 4 : row >= 5
}

export function isAttacked(bd, sq, by) {
  const r = rowOf(sq), c = colOf(sq)

  // --- pawns: they only ever attack one step diagonally forward ---
  const pf = by === RED ? 1 : -1
  const pr = r + pf
  if (pr >= 0 && pr < 10) {
    const p = bd[idx(pr, c)]
    if (p && colorOf(p) === by && typeOf(p) === 7) return true
  }
  if (crossedRiver(r, by)) {
    for (const dc of [-1, 1]) {
      const cc = c + dc
      if (cc < 0 || cc > 8) continue
      const p = bd[idx(r, cc)]
      if (p && colorOf(p) === by && typeOf(p) === 7) return true
    }
  }

  // --- horses: blocked by their own leg ---
  for (const [dr, dc] of KNIGHT_DELTAS) {
    const hr = r + dr, hc = c + dc
    if (!inBoard(hr, hc)) continue
    const p = bd[idx(hr, hc)]
    if (!p || colorOf(p) !== by || typeOf(p) !== 4) continue
    const lr = Math.abs(dr) === 2 ? hr - Math.sign(dr) : hr
    const lc = Math.abs(dc) === 2 ? hc - Math.sign(dc) : hc
    if (!bd[idx(lr, lc)]) return true
  }

  // --- flying pieces along the four rays ---
  //   chariot (5) and un-jumped cannon (6) hit the first square they reach;
  //   a cannon also hits the square behind exactly one screen piece;
  //   a general only hits the square directly beside it. The flying-general
  //   line is a separate rule and is covered by facingKings().
for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
    let rr = r + dr, cc = c + dc, dist = 0, seenFirst = false
    while (rr >= 0 && rr < 10 && cc >= 0 && cc < 9) {
      dist++
      const p = bd[idx(rr, cc)]
      if (p) {
        if (!seenFirst) {
          if (colorOf(p) === by) {
            const t = typeOf(p)
            if (t === 5 || t === 6) return true
            if (t === 1 && dist === 1) return true
          }
          seenFirst = true
        } else {
          if (colorOf(p) === by && typeOf(p) === 6) return true
          break
        }
      }
      rr += dr; cc += dc
    }
  }

  // --- advisors (one point diagonally, inside the palace) ---
  // --- elephants (two points diagonally, never across the river) ---
  for (const [dr, dc] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) {
    const ar = r + dr, ac = c + dc
    if (inBoard(ar, ac)) {
      const p = bd[idx(ar, ac)]
      if (p && colorOf(p) === by && typeOf(p) === 2 && inPalace(ar, ac, by)) return true
    }
    const er = r + 2 * dr, ec = c + 2 * dc
    if (inBoard(er, ec) && !bd[idx(ar, ac)]) {
      const ep = bd[idx(er, ec)]
      if (ep && colorOf(ep) === by && typeOf(ep) === 3 && !crossedRiver(er, by)) return true
    }
  }
  return false
}

export function facingKings(bd) {
  const rk = kingSq(bd, RED), bk = kingSq(bd, BLACK)
  if (rk < 0 || bk < 0) return false
  if (colOf(rk) !== colOf(bk)) return false
  const c = colOf(rk)
  for (let r = rowOf(bk) + 1; r < rowOf(rk); r++) if (bd[idx(r, c)]) return false
  return true
}

export function makeMove(bd, mv) {
  const from = mv >> 8, to = mv & 255
  const pc = bd[from], cap = bd[to]
  bd[to] = pc
  bd[from] = 0
  return cap
}

export function unmakeMove(bd, mv, cap) {
  const from = mv >> 8, to = mv & 255
  bd[from] = bd[to]
  bd[to] = cap
}

export function sideInCheck(bd, color) {
  const ks = kingSq(bd, color)
  if (ks < 0) return true
  return isAttacked(bd, ks, color ^ 1) || facingKings(bd)
}

export function legalMoves(bd, turn) {
  const out = []
  for (const mv of generateMoves(bd, turn)) {
    const cap = makeMove(bd, mv)
    const bad = sideInCheck(bd, turn)
    unmakeMove(bd, mv, cap)
    if (!bad) out.push(mv)
  }
  return out
}

export function legalTargetsFor(bd, turn, from) {
  const set = new Set()
  if (from < 0 || !bd[from] || colorOf(bd[from]) !== turn) return set
  for (const mv of legalMoves(bd, turn)) {
    if ((mv >> 8) === from) set.add(mv & 255)
  }
  return set
}

export function findLegalMove(bd, turn, from, to) {
  for (const mv of legalMoves(bd, turn)) {
    if ((mv >> 8) === from && (mv & 255) === to) return mv
  }
  return 0
}

// ---------------------------------------------------------------------------
// Rules helpers
// ---------------------------------------------------------------------------

/** Stable identity of a game position (piece placement + side to move). */
export function repetitionKey(bd, turn) {
  let s = ''
  for (let i = 0; i < 90; i++) if (bd[i]) s += bd[i] + ','
  return (turn === RED ? 'w' : 'b') + s
}

/** How many times each position occurs along a game (for threefold claims). */
export function repetitionMap(startFen, iccsList) {
  const st = parseFen(startFen)
  const bd = st.bd
  let turn = st.turn
  const counts = new Map()
  const put = () => {
    const k = repetitionKey(bd, turn)
    counts.set(k, (counts.get(k) || 0) + 1)
  }
  put()
  for (const s of iccsList || []) {
    if (typeof s !== 'string' || s.length !== 4) break
    const from = iccsToSq(s.slice(0, 2)), to = iccsToSq(s.slice(2, 4))
    if (from < 0 || from > 89 || to < 0 || to > 89 || !bd[from] || colorOf(bd[from]) !== turn) break
    if (!findLegalMove(bd, turn, from, to)) break
    makeMove(bd, (from << 8) | to)
    turn ^= 1
    put()
  }
  return counts
}

/**
 * Positions where neither side can possibly deliver mate.
 * Only advisors and elephants remain on both sides — no chariot, cannon, horse
 * or pawn can ever checkmate, so the game is dead drawn.
 */
export function insufficientMaterial(bd) {
  const attackers = { [RED]: 0, [BLACK]: 0 }
  const kings = { [RED]: 0, [BLACK]: 0 }
  for (let i = 0; i < 90; i++) {
    const p = bd[i]
    if (!p) continue
    const c = colorOf(p), t = typeOf(p)
    if (t === 1) kings[c]++
    else if (t >= 4) attackers[c]++
  }
  for (const c of [RED, BLACK]) if (!kings[c]) return false
  return attackers[RED] === 0 && attackers[BLACK] === 0
}

/**
 * Terminal state of a position for the side to move.
 * In xiangqi a side with no legal move loses, whether or not it is in check.
 */
export function gameStatus(bd, turn, ctx = {}) {
  const moves = legalMoves(bd, turn)
  if (moves.length > 0) {
    if (ctx.repCount >= 3) return { over: true, reason: 'repetition', winner: null }
    if (ctx.insufficient !== false && insufficientMaterial(bd)) {
      return { over: true, reason: 'insufficient', winner: null }
    }
    return { over: false, reason: null, winner: null, moves }
  }
  return {
    over: true,
    reason: sideInCheck(bd, turn) ? 'checkmate' : 'stalemate',
    winner: turn ^ 1
  }
}

/** True when the side to move is delivering or facing a forced checkmate. */
export function isForcedMateFor(bd, turn, depthLimit = 4) {
  const opp = turn ^ 1
  for (const mv of generateMoves(bd, turn)) {
    const cap = makeMove(bd, mv)
    const ok = legalMoves(bd, opp).length === 0 && sideInCheck(bd, opp)
    unmakeMove(bd, mv, cap)
    if (ok) return true
    void depthLimit
  }
  return false
}

/**
 * Replay an ICCS move list from `startFen`, returning one annotated position
 * per ply. Illegal / malformed moves (which can appear when a saved game in
 * localStorage was corrupted or hand-edited) stop the replay instead of
 * corrupting the board, and the returned array is flagged `truncated`.
 */
export function replay(startFen, iccsList) {
  const start = parseFen(startFen)
  const bd = start.bd
  let turn = start.turn
  const seen = new Map()
  const repKey = repetitionKey(bd, turn)
  seen.set(repKey, 1)

  const mk = (move, capture, checkSq, from, to) => ({
    bd: Int8Array.from(bd),
    turn,
    move,
    capture,
    checkSq,
    fen: toFen(bd, turn),
    key: repetitionKey(bd, turn),
    repCount: seen.get(repetitionKey(bd, turn)) || 1,
    lastFrom: from,
    lastTo: to,
    capturedByRed: [...trayR],
    capturedByBlack: [...trayB]
  })

  const trayR = [], trayB = []
  const positions = [mk(null, 0, -1, -1, -1)]
  let truncated = false

  for (const s of iccsList || []) {
    if (typeof s !== 'string' || s.length !== 4) { truncated = true; break }
    const from = iccsToSq(s.slice(0, 2)), to = iccsToSq(s.slice(2, 4))
    if (from < 0 || from > 89 || to < 0 || to > 89 || !bd[from] || colorOf(bd[from]) !== turn) {
      truncated = true
      break
    }
    const mv = findLegalMove(bd, turn, from, to)
    if (!mv) { truncated = true; break }

    const mover = turn
    const pc = bd[from], cap = bd[to]
    makeMove(bd, mv)
    turn ^= 1
    if (cap) {
      if (mover === RED) trayR.push(cap)
      else trayB.push(cap)
    }
    const k = repetitionKey(bd, turn)
    seen.set(k, (seen.get(k) || 0) + 1)
    let checkSq = -1
    const ks = kingSq(bd, turn)
    if (ks >= 0 && isAttacked(bd, ks, mover)) checkSq = ks
    positions.push(mk({ from, to, piece: pc, capture: cap, mover }, cap, checkSq, from, to))
  }

  positions.truncated = truncated
  return positions
}

export function sqToIccs(sq) {
  return String.fromCharCode(97 + colOf(sq)) + String.fromCharCode(48 + (9 - rowOf(sq)))
}

export function iccsToSq(s) {
  return idx(9 - (s.charCodeAt(1) - 48), s.charCodeAt(0) - 97)
}

export function mvToIccs(mv) {
  return sqToIccs(mv >> 8) + sqToIccs(mv & 255)
}
