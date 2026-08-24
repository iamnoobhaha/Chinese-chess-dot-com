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

export function isAttacked(bd, sq, by) {
  const r = rowOf(sq), c = colOf(sq)

  const pf = by === RED ? 1 : -1
  const pr = r + pf
  if (pr >= 0 && pr < 10) {
    const p = bd[idx(pr, c)]
    if (p && colorOf(p) === by && typeOf(p) === 7) return true
  }
  for (const dc of [-1, 1]) {
    const cc = c + dc
    if (cc < 0 || cc > 8) continue
    const p = bd[idx(r, cc)]
    if (p && colorOf(p) === by && typeOf(p) === 7) {
      const crossed = by === RED ? r <= 4 : r >= 5
      if (crossed) return true
    }
  }

  for (const [dr, dc] of KNIGHT_DELTAS) {
    const hr = r + dr, hc = c + dc
    if (!inBoard(hr, hc)) continue
    const p = bd[idx(hr, hc)]
    if (!p || colorOf(p) !== by || typeOf(p) !== 4) continue
    const lr = Math.abs(dr) === 2 ? hr - Math.sign(dr) : hr
    const lc = Math.abs(dc) === 2 ? hc - Math.sign(dc) : hc
    if (!bd[idx(lr, lc)]) return true
  }

  for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
    let rr = r + dr, cc = c + dc, seenFirst = false
    while (rr >= 0 && rr < 10 && cc >= 0 && cc < 9) {
      const p = bd[idx(rr, cc)]
      if (p) {
        if (!seenFirst) {
          if (colorOf(p) === by) {
            const t = typeOf(p)
            if (t === 5) return true
            if (t === 1) return true
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

  for (const [dr, dc] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) {
    const ar = r + dr, ac = c + dc
    if (inBoard(ar, ac)) {
      const p = bd[idx(ar, ac)]
      if (p && colorOf(p) === by && typeOf(p) === 2 && inPalace(r, c, by)) return true
    }
    const er = r + 2 * dr, ec = c + 2 * dc
    if (inBoard(er, ec)) {
      const ep = bd[idx(er, ec)]
      if (ep && colorOf(ep) === by && typeOf(ep) === 3 && !bd[idx(ar, ac)]) {
        const okSide = by === RED ? r >= 5 : r <= 4
        if (okSide) return true
      }
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

export function replay(startFen, iccsList) {
  let { bd, turn } = parseFen(startFen)
  const positions = [{
    bd: Int8Array.from(bd),
    turn,
    move: null,
    capture: 0,
    checkSq: -1,
    fen: toFen(bd, turn),
    lastFrom: -1,
    lastTo: -1,
    capturedByRed: [],
    capturedByBlack: []
  }]
  const trayR = [], trayB = []
  for (const s of iccsList) {
    const from = iccsToSq(s.slice(0, 2)), to = iccsToSq(s.slice(2, 4))
    const mover = turn
    const pc = bd[from], cap = bd[to]
    makeMove(bd, (from << 8) | to)
    turn ^= 1
    if (cap) {
      if (mover === RED) trayR.push(cap)
      else trayB.push(cap)
    }
    let checkSq = -1
    const ok = kingSq(bd, turn)
    if (ok >= 0 && isAttacked(bd, ok, mover)) checkSq = ok
    positions.push({
      bd: Int8Array.from(bd),
      turn,
      move: { from, to, piece: pc },
      capture: cap,
      checkSq,
      fen: toFen(bd, turn),
      lastFrom: from,
      lastTo: to,
      capturedByRed: [...trayR],
      capturedByBlack: [...trayB]
    })
  }
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
