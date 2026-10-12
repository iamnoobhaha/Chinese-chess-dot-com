/**
 * Independent rules audit.
 *
 * Every rule here is re-implemented from scratch and cross-checked against the
 * real implementation, so a bug in board.js cannot hide behind board.js.
 * The anchor is perft: the published xiangqi node counts must match exactly.
 *
 *   node tests/audit-rules.mjs [positions]
 */
import * as B from '../src/engine/board.js'

const { parseFen, toFen, legalMoves, isAttacked, sideInCheck, generateMoves, kingSq, typeOf, colorOf } = B

// ---------------------------------------------------------------------------
// Reference implementation
// ---------------------------------------------------------------------------
const RED = 0, BLACK = 1
const at = (r, c) => r * 9 + c
const rowOf = s => (s / 9) | 0
const colOf = s => s % 9
const on = (r, c) => r >= 0 && r < 10 && c >= 0 && c < 9
const palace = (r, c, side) => c >= 3 && c <= 5 && (side === RED ? r >= 7 : r <= 2)
const pastRiver = (r, side) => (side === RED ? r <= 4 : r >= 5)

const HORSE = [
  [-2, -1, -1, 0], [-2, 1, -1, 0], [2, -1, 1, 0], [2, 1, 1, 0],
  [-1, -2, 0, -1], [1, -2, 0, -1], [-1, 2, 0, 1], [1, 2, 0, 1]
]
const ORTHO = [[-1, 0], [1, 0], [0, -1], [0, 1]]
const DIAG = [[-1, -1], [-1, 1], [1, -1], [1, 1]]
const ELEPH = [[-2, -2], [-2, 2], [2, -2], [2, 2]]

/**
 * Pseudo-legal moves for `side`, encoded as from*256+to.
 *
 * `target` answers "could this side reach that square?" even when the square
 * holds one of its own pieces (self-defence). Only the destination filter is
 * relaxed — every ray leading up to it is computed on the real board.
 */
function pseudo(bd, side, target = -1) {
  const out = []
  const to = (from, r, c) => {
    if (!on(r, c)) return
    const sq = at(r, c)
    const victim = bd[sq]
    if (victim && colorOf(victim) === side && sq !== target) return
    out.push(from * 256 + sq)
  }

  for (let s = 0; s < 90; s++) {
    const p = bd[s]
    if (!p || colorOf(p) !== side) continue
    const t = typeOf(p)
    const r = rowOf(s), c = colOf(s)

    if (t === 1) {
      for (const [dr, dc] of ORTHO) {
        const rr = r + dr, cc = c + dc
        if (palace(rr, cc, side)) to(s, rr, cc)
      }
    } else if (t === 2) {
      for (const [dr, dc] of DIAG) {
        const rr = r + dr, cc = c + dc
        if (palace(rr, cc, side)) to(s, rr, cc)
      }
    } else if (t === 3) {
      for (const [dr, dc] of ELEPH) {
        const rr = r + dr, cc = c + dc
        if (!on(rr, cc)) continue
        if (pastRiver(rr, side)) continue
        if (bd[at(r + dr / 2, c + dc / 2)]) continue
        to(s, rr, cc)
      }
    } else if (t === 4) {
      for (const [dr, dc, lr, lc] of HORSE) {
        const rr = r + dr, cc = c + dc
        if (!on(rr, cc)) continue
        if (bd[at(r + lr, c + lc)]) continue
        to(s, rr, cc)
      }
    } else if (t === 5) {
      // chariot: stops at the first piece, takes it if enemy
      for (const [dr, dc] of ORTHO) {
        let rr = r + dr, cc = c + dc
        while (on(rr, cc)) {
          const victim = bd[at(rr, cc)]
          if (!victim) {
            to(s, rr, cc)
          } else {
            if (colorOf(victim) !== side) to(s, rr, cc)
            break
          }
          rr += dr; cc += dc
        }
      }
    } else if (t === 6) {
      // cannon: glides over empty squares, but to capture it must jump exactly
      // one piece. The first piece it meets is only a screen and is never taken.
      for (const [dr, dc] of ORTHO) {
        let rr = r + dr, cc = c + dc, jumped = false
        while (on(rr, cc)) {
          const victim = bd[at(rr, cc)]
          if (!victim) {
            if (!jumped) to(s, rr, cc)
          } else if (!jumped) {
            jumped = true
          } else {
            if (colorOf(victim) !== side) to(s, rr, cc)
            break
          }
          rr += dr; cc += dc
        }
      }
    } else {
      to(s, r + (side === RED ? -1 : 1), c)
      if (pastRiver(r, side)) { to(s, r, c - 1); to(s, r, c + 1) }
    }
  }
  return out
}

/**
 * Is `sq` attacked or defended by `side`?
 *
 * Attacking means CAPTURING, so a piece that can only glide there quietly does
 * not count — that is exactly why a cannon with no screen does not attack the
 * square in front of it. A dummy enemy piece is placed on `sq`, which cannot
 * perturb any ray (every ray stops when it reaches that square) and also covers
 * a square held by one of `side`'s own pieces.
 */
function attacked(bd, sq, side) {
  const occupant = bd[sq]
  bd[sq] = side === RED ? 15 : 7 // enemy pawn
  let hit = false
  for (const mv of pseudo(bd, side)) {
    if ((mv & 255) === sq) { hit = true; break }
  }
  bd[sq] = occupant
  return hit
}

function generalsFace(bd) {
  const a = kingSq(bd, RED)
  const b = kingSq(bd, BLACK)
  if (a < 0 || b < 0) return false
  if (colOf(a) !== colOf(b)) return false
  for (let i = Math.min(a, b) + 9; i < Math.max(a, b); i += 9) {
    if (bd[i]) return false
  }
  return true
}

function inCheck(bd, side) {
  const k = kingSq(bd, side)
  if (k < 0) return true
  return attacked(bd, k, side ^ 1) || generalsFace(bd)
}

function legalRef(bd, side) {
  const out = []
  for (const mv of pseudo(bd, side)) {
    const from = mv >> 8, dest = mv & 255
    const cap = bd[dest]
    bd[dest] = bd[from]; bd[from] = 0
    if (!inCheck(bd, side)) out.push(mv)
    bd[from] = bd[dest]; bd[dest] = cap
  }
  return out
}

const sqName = s => String.fromCharCode(97 + colOf(s)) + String.fromCharCode(48 + 9 - rowOf(s))
const mvName = mv => sqName(mv >> 8) + sqName(mv & 255)

// ---------------------------------------------------------------------------
// Harness
// ---------------------------------------------------------------------------
let failures = 0
const check = (label, cond, extra = '') => {
  if (cond) console.log(`PASS ${label} ${extra}`)
  else { console.log(`FAIL ${label} ${extra}`); failures++ }
}

function perft(bd, side, depth) {
  if (depth === 0) return 1
  let n = 0
  for (const mv of legalRef(bd, side)) {
    const from = mv >> 8, dest = mv & 255
    const cap = bd[dest]
    bd[dest] = bd[from]; bd[from] = 0
    n += perft(bd, side ^ 1, depth - 1)
    bd[from] = bd[dest]; bd[dest] = cap
  }
  return n
}

const PUBLISHED = { 1: 44, 2: 1920, 3: 79666, 4: 3290240, 5: 133312995 }
{
  const { bd } = parseFen(B.START_FEN)
  for (const d of [1, 2, 3, 4]) {
    const got = perft(bd, 0, d)
    check(`perft(${d}) = ${PUBLISHED[d]} (independent reference)`, got === PUBLISHED[d], `got ${got}`)
  }
}

// The same walk using the real implementation, so the deep counts come from the
// code that actually plays the game.
function perftImpl(bd, side, depth) {
  if (depth === 0) return 1
  let n = 0
  for (const mv of legalMoves(bd, side)) {
    const from = mv >> 8, dest = mv & 255
    const cap = bd[dest]
    bd[dest] = bd[from]; bd[from] = 0
    n += perftImpl(bd, side ^ 1, depth - 1)
    bd[from] = bd[dest]; bd[dest] = cap
  }
  return n
}

for (const d of [1, 2, 3, 4]) {
  const { bd } = parseFen(B.START_FEN)
  const got = perftImpl(bd, 0, d)
  check(`perft(${d}) = ${PUBLISHED[d]} (implementation)`, got === PUBLISHED[d], `got ${got}`)
}

function makePosition(seed) {
  let s = seed >>> 0
  const rnd = () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296
  const bd = new Int8Array(90)
  bd[at(9, 4)] = 1
  bd[at(0, 4)] = 9
  const scatter = (type, side, n) => {
    for (let k = 0; k < n; k++) {
      for (let tries = 0; tries < 500; tries++) {
        const r = (rnd() * 10) | 0, c = (rnd() * 9) | 0
        if (bd[at(r, c)]) continue
        if (type === 2 && !palace(r, c, side)) continue
        if (type === 3 && pastRiver(r, side)) continue
        bd[at(r, c)] = side * 8 + type
        break
      }
    }
  }
  for (const side of [RED, BLACK]) {
    scatter(5, side, 2); scatter(4, side, 2); scatter(6, side, 2)
    scatter(7, side, 4); scatter(2, side, 2); scatter(3, side, 2)
  }
  return { bd, turn: rnd() < 0.5 ? RED : BLACK }
}

const N = Number(process.argv[2] || 3000)
let badPseudo = 0, badAttack = 0, badLegal = 0, badCheck = 0
const shown = { p: 0, a: 0, l: 0, c: 0 }

for (let i = 0; i < N; i++) {
  const { bd, turn } = makePosition(0x1234567 + i * 2654435761)

  const refPseudo = pseudo(bd, turn).sort((a, b) => a - b).join(',')
  const impPseudo = generateMoves(bd, turn).slice().sort((a, b) => a - b).join(',')
  if (refPseudo !== impPseudo) {
    badPseudo++
    if (shown.p++ === 0) console.log('   pseudo: fen=' + toFen(bd, turn))
  }

  for (const sq of [4, 40, 44, 45, 22, 31, 13, 49, 67, 80, 85]) {
    for (const by of [RED, BLACK]) {
      const a = attacked(bd, sq, by)
      const b = isAttacked(bd, sq, by)
      if (a !== b) {
        badAttack++
        if (shown.a++ < 4) {
          // which piece does the reference think does it?
          const save = bd[sq]
          bd[sq] = by === RED ? 15 : 7
          const via = pseudo(bd, by).filter(m => (m & 255) === sq)
            .map(m => `${sqName(m >> 8)}(t${typeOf(bd[m >> 8])})`)
          bd[sq] = save
          console.log(`   attack sq=${sqName(sq)} by=${by === RED ? 'R' : 'B'} ref=${a} impl=${b} via=${via.join(',') || '-'} occ=t${typeOf(save)} fen=${toFen(bd, turn)}`)
        }
      }
    }
  }

  for (const side of [RED, BLACK]) {
    if (inCheck(bd, side) !== sideInCheck(bd, side)) {
      badCheck++
      if (shown.c++ === 0) console.log('   check ' + (side === RED ? 'R' : 'B') + ' fen=' + toFen(bd, turn))
    }
  }

  const refLegal = legalRef(bd, turn).map(mvName).sort().join(',')
  const impLegal = legalMoves(bd, turn).map(mvName).sort().join(',')
  if (refLegal !== impLegal) {
    badLegal++
    if (shown.l++ === 0) console.log('   legal: fen=' + toFen(bd, turn))
  }
}

check(`pseudo-legal generation matches (${N} positions)`, badPseudo === 0, `${badPseudo} bad`)
check('isAttacked matches an independent generator', badAttack === 0, `${badAttack} bad`)
check('sideInCheck matches', badCheck === 0, `${badCheck} bad`)
check('legal move filtering matches', badLegal === 0, `${badLegal} bad`)

// ---- cannon rules, spelled out ---------------------------------------------
{
  const K = 1 * 9 + 4 // e8
  const cases = [
    // A cannon may glide to an empty square but may only CAPTURE through a
    // screen, so it must not count as attacking anything on an open file.
    ['cannon does not attack the square in front of it',
      '4k4/9/9/9/9/9/9/9/9/4C4 w', K, RED, false],
    ['cannon does not attack the general on an open file',
      '4k4/9/9/9/9/9/9/9/9/4C4 w', 0 * 9 + 4, RED, false],
    ['cannon behind exactly one screen does attack',
      '4k4/9/9/9/9/9/4r4/9/9/4C4 w', 0 * 9 + 4, RED, true],
    ['cannon behind two screens does not attack',
      '4k4/9/9/9/4r4/9/4r4/9/9/4C4 w', 0 * 9 + 4, RED, false],
    ['chariot does attack the square in front of it',
      '4k4/9/9/9/9/9/9/9/9/4R4 w', 0 * 9 + 4, RED, true],
    ['cannon attacks through its own screen',
      '4k4/9/9/4p4/9/4r4/9/4C4/9/4K4 w', 3 * 9 + 4, RED, true],
    ['advisor may not attack out of the palace',
      '3aka3/9/9/9/9/9/9/9/9/4K4 w', 1 * 9 + 2, BLACK, false],
    ['elephant may not attack across the river',
      '4k4/9/9/9/9/9/9/4b4/9/4K4 w', 3 * 9 + 4, BLACK, false]
  ]
  for (const [label, fen, sq, by, want] of cases) {
    const { bd } = parseFen(fen)
    check(label, isAttacked(bd, sq, by) === want && attacked(bd, sq, by) === want,
      `impl=${isAttacked(bd, sq, by)} ref=${attacked(bd, sq, by)} want=${want}`)
  }
}

// ---- the position from the bug report --------------------------------------
{
  const MOVES = ['h2e2', 'h9g7', 'h0g2', 'i9h9', 'i0h0', 'b9c7', 'e3e4', 'e6e5']
  const bd = parseFen(B.START_FEN).bd
  for (const s of MOVES) {
    const f = B.iccsToSq(s.slice(0, 2)), t = B.iccsToSq(s.slice(2, 4))
    bd[t] = bd[f]; bd[f] = 0
  }
  const f = B.iccsToSq('e2'), t = B.iccsToSq('e5')
  bd[t] = bd[f]; bd[f] = 0

  const inChk = inCheck(bd, BLACK)
  const replies = legalRef(bd, BLACK).map(mvName)
  console.log('\nreplayed 1.h2e2 h9g7 2.h0g2 i9h9 3.i0h0 b9c7 4.e3e4 e6e5 5.e2e5')
  console.log('  black in check :', inChk)
  console.log('  black replies  :', replies.slice(0, 8).join(' ') || '(none)', replies.length > 8 ? `(+${replies.length - 8} more)` : '')
  check('cannon on e5 does NOT give check without a screen', !inChk && !sideInCheck(bd, BLACK))
  check('black is not mated', replies.length > 0 && legalMoves(bd, BLACK).length > 0,
    `${legalMoves(bd, BLACK).length} legal replies`)
}

// ---- the engine must never claim a mate that is not one -------------------
{
  // Walk a real game and, at every position the engine calls a mate, re-derive
  // the terminal state with the independent rules above. This is the guard for
  // "engine reports mate but the side can still move".
  const { analyzePosition } = await import('../src/engine/search.js')
  const moves = ['h2e2', 'h9g7', 'h0g2', 'i9h9', 'i0h0', 'b9c7', 'e3e4', 'e6e5',
    'c3c4', 'a9a8', 'c0e2', 'c7e6', 'b2b6', 'e4e6', 'a0b0', 'a8a9']
  let claimed = 0
  let falsePositives = 0
  for (let j = 0; j <= moves.length; j++) {
    const fenNow = B.toFen(...(() => {
      const st = parseFen(B.START_FEN)
      const bd = st.bd
      let turn = st.turn
      for (const s of moves.slice(0, j)) {
        const f = B.iccsToSq(s.slice(0, 2)), t = B.iccsToSq(s.slice(2, 4))
        bd[t] = bd[f]; bd[f] = 0
        turn ^= 1
      }
      return [bd, turn]
    })())
    const res = analyzePosition(B.START_FEN, moves.slice(0, j), 8, 900, { lines: 2 })
    if (!res.mateIn) continue
    claimed++
    const st = parseFen(fenNow)
    const side = j % 2 === 0 ? RED : BLACK
    const reallyMated = !inCheck(st.bd, side) ? false : legalRef(st.bd, side).length === 0
    const engineSaysMated = res.mateIn > 0
    if (engineSaysMated !== reallyMated) {
      falsePositives++
      console.log(`   false mate at ply ${j} (${moves.slice(0, j).join(' ')}) claimed mateIn=${res.mateIn}`)
    }
  }
  check(`engine mate claims match the reference (${claimed} claimed)`, falsePositives === 0,
    `${falsePositives} false`)
}

process.exit(failures ? 1 : 0)