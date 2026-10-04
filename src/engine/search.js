import {
  RED, BLACK, parseFen, generateMoves, sideInCheck, typeOf, mvToIccs, insufficientMaterial
} from './board.js'
import { evaluate, VAL } from './evaluate.js'

const MATE = 100000
const INF = 1000000
const MATE_THRESHOLD = 90000
const QS_PLY_CAP = 64

const TT_BITS = 19
const TT_SIZE = 1 << TT_BITS
const TT_MASK = TT_SIZE - 1
const TT_KEYS = new Int32Array(TT_SIZE)
const TT_DEPTHS = new Int8Array(TT_SIZE)
const TT_FLAGS = new Int8Array(TT_SIZE)
const TT_SCORES = new Int32Array(TT_SIZE)
const TT_MOVES = new Int32Array(TT_SIZE)

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0)
  }
}

const ZP = new Uint32Array(16 * 90)
const ZT = new Uint32Array(2)
{
  const rnd = mulberry32(0x9E3779B9)
  for (let i = 0; i < ZP.length; i++) ZP[i] = rnd()
  ZT[0] = rnd(); ZT[1] = rnd()
}

let BD = null
let TURN = RED
let HASH = 0
let stackCaps = []
let hashStack = []
let killers = []
let historyHeur = new Int32Array(90 * 90)
let nodes = 0
let stopAt = 0
let stopped = false

export const LEVELS = [
  { depth: 1, movetime: 200, margin: 250, blunder: 0.40 },
  { depth: 2, movetime: 350, margin: 170, blunder: 0.25 },
  { depth: 3, movetime: 700, margin: 110, blunder: 0.10 },
  { depth: 4, movetime: 1100, margin: 65, blunder: 0.04 },
  { depth: 6, movetime: 1800, margin: 30, blunder: 0.01 },
  { depth: 8, movetime: 3000, margin: 12, blunder: 0 },
  { depth: 10, movetime: 5000, margin: 0, blunder: 0 },
  { depth: 12, movetime: 8000, margin: 0, blunder: 0 }
]

export function setup(fen, iccsList) {
  const st = parseFen(fen)
  BD = st.bd
  TURN = st.turn
  HASH = 0
  for (let i = 0; i < 90; i++) if (BD[i]) HASH ^= ZP[BD[i] * 90 + i]
  if (TURN === BLACK) HASH ^= ZT[1]
  stackCaps = []
  hashStack = [HASH | 0]
  for (const s of iccsList || []) {
    const from = (s.charCodeAt(0) - 97) + (9 - (s.charCodeAt(1) - 48)) * 9
    const to = (s.charCodeAt(2) - 97) + (9 - (s.charCodeAt(3) - 48)) * 9
    applyMove((from << 8) | to)
  }
}

function applyMove(mv) {
  const from = mv >> 8, to = mv & 255
  const pc = BD[from], cap = BD[to]
  HASH ^= ZP[pc * 90 + from] ^ ZP[pc * 90 + to]
  if (cap) HASH ^= ZP[cap * 90 + to]
  HASH ^= ZT[TURN]
  BD[to] = pc
  BD[from] = 0
  TURN ^= 1
  stackCaps.push(cap)
  hashStack.push(HASH | 0)
}

function undoMove(mv) {
  const cap = stackCaps.pop()
  const from = mv >> 8, to = mv & 255
  const pc = BD[to]
  BD[from] = pc
  BD[to] = cap
  TURN ^= 1
  HASH ^= ZP[pc * 90 + from] ^ ZP[pc * 90 + to]
  if (cap) HASH ^= ZP[cap * 90 + to]
  HASH ^= ZT[TURN]
  hashStack.pop()
}

function isRepetition() {
  const h = HASH | 0
  const start = hashStack.length - 33
  for (let i = hashStack.length - 2; i >= 0 && i >= start; i--) {
    if (hashStack[i] === h) return true
  }
  return false
}

// Mate scores are stored relative to the node they were found at, otherwise a
// cached "mate in 3" would be replayed as "mate in 1" two plies deeper.
function scoreToTT(s, ply) {
  if (s > MATE_THRESHOLD) return s + ply
  if (s < -MATE_THRESHOLD) return s - ply
  return s
}

function scoreFromTT(s, ply) {
  if (s > MATE_THRESHOLD) return s - ply
  if (s < -MATE_THRESHOLD) return s + ply
  return s
}

function qsearch(alpha, beta, ply) {
  nodes++
  if ((nodes & 2047) === 0 && Date.now() > stopAt) { stopped = true; return 0 }
  if (ply > 0 && isRepetition()) return 0
  const inChk = sideInCheck(BD, TURN)
  let stand = -INF
  if (!inChk) {
    stand = evaluate(BD, TURN)
    if (stand >= beta) return stand
    if (stand > alpha) alpha = stand
    if (ply > QS_PLY_CAP) return stand
  } else if (ply > QS_PLY_CAP + 8) {
    // pathological checking chain: report a loss rather than looping forever
    return -MATE + ply
  }
  const moves = generateMoves(BD, TURN)
  let scoredMoves = moves
  if (!inChk) {
    const caps = []
    for (const m of moves) {
      const to = m & 255
      if (BD[to]) caps.push(m)
    }
    caps.sort((a, b) => VAL[typeOf(BD[b & 255])] - VAL[typeOf(BD[a & 255])])
    scoredMoves = caps
  }
  let legalCount = 0
  let best = -INF
  for (const m of scoredMoves) {
    if (!inChk) {
      const victimVal = VAL[typeOf(BD[m & 255])]
      if (stand + victimVal + 200 < alpha) continue
    }
    applyMove(m)
    if (sideInCheck(BD, TURN ^ 1)) { undoMove(m); continue }
    legalCount++
    const s = -qsearch(-beta, -alpha, ply + 1)
    undoMove(m)
    if (stopped) return 0
    if (s > best) best = s
    if (s >= beta) return s
    if (s > alpha) alpha = s
  }
  if (inChk && legalCount === 0) return -MATE + ply
  return best > -INF ? best : stand
}

function search(depth, alpha, beta, ply, pvLine) {
  if (stopped) return 0
  nodes++
  if ((nodes & 2047) === 0 && Date.now() > stopAt) { stopped = true; return 0 }

  const inChk = sideInCheck(BD, TURN)
  if (ply > 0 && isRepetition()) return 0
  if (inChk && depth < 30) depth++
  if (depth <= 0) return qsearch(alpha, beta, ply)

  const ttIdx = HASH & TT_MASK
  let ttMove = 0
  if (TT_KEYS[ttIdx] === (HASH | 0)) {
    ttMove = TT_MOVES[ttIdx]
    if (ply > 0 && TT_DEPTHS[ttIdx] >= depth) {
      const f = TT_FLAGS[ttIdx], sc = scoreFromTT(TT_SCORES[ttIdx], ply)
      if (f === 0 || (f === 1 && sc >= beta) || (f === 2 && sc <= alpha)) return sc
    }
  }

  const moves = generateMoves(BD, TURN)
  const scored = []
  for (const m of moves) {
    let sc = 0
    if (m === ttMove) sc = 1000000
    else if (BD[m & 255]) sc = 100000 + VAL[typeOf(BD[m & 255])] * 10 - VAL[typeOf(BD[m >> 8])]
    else {
      if (killers[ply] === m) sc = 90000
      else if (killers[ply + 64] === m) sc = 80000
      else sc = historyHeur[(m >> 8) * 90 + (m & 255)]
    }
    scored.push([sc, m])
  }
  scored.sort((a, b) => b[0] - a[0])

  let legalCount = 0
  let bestScore = -INF
  let bestMove = 0
  let origAlpha = alpha
  const childPv = []

  for (let i = 0; i < scored.length; i++) {
    const mv = scored[i][1]
    applyMove(mv)
    if (sideInCheck(BD, TURN ^ 1)) { undoMove(mv); continue }
    legalCount++
    let s
    if (i === 0 || alpha <= -INF + 1) {
      s = -search(depth - 1, -beta, -alpha, ply + 1, childPv)
    } else {
      s = -search(depth - 1, -alpha - 1, -alpha, ply + 1, [])
      if (s > alpha && !stopped) {
        s = -search(depth - 1, -beta, -alpha, ply + 1, childPv)
      }
    }
    undoMove(mv)
    if (stopped) return 0
    if (s > bestScore) { bestScore = s; bestMove = mv }
    if (s >= beta) {
      if (!BD[mv & 255]) {
        if (killers[ply] !== mv) { killers[ply + 64] = killers[ply]; killers[ply] = mv }
        historyHeur[(mv >> 8) * 90 + (mv & 255)] += depth * depth
      }
      storeTT(depth, 1, scoreToTT(s, ply), mv)
      return s
    }
    if (s > alpha) {
      alpha = s
      pvLine.length = 0
      pvLine.push(mv, ...childPv)
    }
  }

  if (legalCount === 0) {
    if (ply === 0 && insufficientMaterial(BD)) return 0
    return -MATE + ply
  }

  storeTT(depth, bestScore >= beta ? 1 : (bestScore > origAlpha ? 0 : 2), scoreToTT(bestScore, ply), bestMove)
  return bestScore
}

function storeTT(depth, flag, score, mv) {
  const i = HASH & TT_MASK
  if (TT_KEYS[i] === (HASH | 0) && TT_DEPTHS[i] > depth) return
  TT_KEYS[i] = HASH | 0
  TT_DEPTHS[i] = depth
  TT_FLAGS[i] = flag
  TT_SCORES[i] = score
  TT_MOVES[i] = mv
}

function rootSearch(depth, collectAll, orderedRoot) {
  const out = []
  let alpha = -INF
  for (const rm of orderedRoot) {
    const line = []
    applyMove(rm.mv)
    let s
    if (collectAll) s = -search(depth - 1, -INF, INF, 1, line)
    else s = -search(depth - 1, -INF, -alpha, 1, line)
    undoMove(rm.mv)
    if (stopped) break
    out.push({ mv: rm.mv, score: s, pv: [rm.mv, ...line] })
    if (!collectAll && s > alpha) alpha = s
  }
  out.sort((a, b) => b.score - a.score)
  return out
}

function allowsMateIn1(mv) {
  applyMove(mv)
  const oppMoves = generateMoves(BD, TURN)
  let found = false
  for (const om of oppMoves) {
    applyMove(om)
    const moverMated = sideInCheck(BD, TURN ^ 1) && generateMoves(BD, TURN).every(m2 => {
      applyMove(m2)
      const bad = sideInCheck(BD, TURN ^ 1)
      undoMove(m2)
      return bad
    })
    undoMove(om)
    if (moverMated) { found = true; break }
  }
  undoMove(mv)
  return found
}

export function think(fen, iccsList, level) {
  setup(fen, iccsList)
  const cfg = LEVELS[Math.max(0, Math.min(7, level - 1))]
  nodes = 0
  stopped = false
  stopAt = Date.now() + cfg.movetime

  const rootMoves = []
  for (const mv of generateMoves(BD, TURN)) {
    applyMove(mv)
    const ok = !sideInCheck(BD, TURN ^ 1)
    undoMove(mv)
    if (ok) rootMoves.push({ mv, score: -INF })
  }
  if (rootMoves.length === 0) return null

  let result = null
  let reachedDepth = 0
  for (let d = 1; d <= cfg.depth; d++) {
    const res = rootSearch(d, d === 1, result || rootMoves.map(r => ({ mv: r.mv })))
    if (stopped) break
    result = res
    reachedDepth = d
    if (Math.abs(res[0].score) > MATE_THRESHOLD) break
  }
  if (!result || result.length === 0) {
    const fallback = rootSearch(1, false, rootMoves)
    result = fallback.length ? fallback : [{ mv: rootMoves[0].mv, score: 0, pv: [rootMoves[0].mv] }]
  }

  const best = result[0]
  let chosen = best
  if (result.length > 1 && cfg.blunder > 0 && Math.random() < cfg.blunder) {
    const half = result.slice(Math.max(1, result.length >> 1))
    const safe = half.filter(x => !allowsMateIn1(x.mv))
    const pool = safe.length ? safe : half
    chosen = pool[(Math.random() * pool.length) | 0]
  } else if (cfg.margin > 0 && result.length > 1) {
    const pool = result.filter(x => x.score >= best.score - cfg.margin)
    chosen = pool[(Math.random() * pool.length) | 0] || best
  }

  return {
    moveIccs: mvToIccs(chosen.mv),
    score: clampScore(best.score),
    rawScore: best.score,
    pv: chosen.pv.slice(0, 8).map(mvToIccs),
    depth: reachedDepth,
    nodes
  }
}

function clampScore(s) {
  if (s > MATE_THRESHOLD) return MATE_THRESHOLD
  if (s < -MATE_THRESHOLD) return -MATE_THRESHOLD
  return s
}

/** Signed mate distance: >0 the side to move mates in n moves, <0 it is mated. */
export function mateDistance(rawScore) {
  if (rawScore > MATE_THRESHOLD) return Math.ceil((MATE - rawScore) / 2)
  if (rawScore < -MATE_THRESHOLD) return -Math.ceil((MATE + rawScore) / 2)
  return 0
}

/** How much worse a move may be and still count as an equally good attempt. */
export const FORCED_TOLERANCE = 12

/** Minimum gap to the second-best move before the best one counts as forced. */
export const FORCED_GAP = 60

function makeAnalysis({ terminal, terminalReason, winner, score, top, legalCount, forced, reachedDepth, nodes, extra }) {
  return {
    terminal,
    terminalReason: terminalReason || null,
    winner: winner === undefined ? null : winner,
    score,
    mateIn: mateDistance(score),
    bestFrom: top ? top.mv >> 8 : -1,
    bestTo: top ? top.mv & 255 : -1,
    pv: top ? top.pv.slice(0, 10).map(mvToIccs) : [],
    lines: extra && extra.lines ? extra.lines : [],
    legalCount: legalCount || 0,
    onlyMove: legalCount === 1,
    forced: !!forced,
    depth: reachedDepth || 0,
    nodes: nodes || 0,
    ...(extra || {})
  }
}

/**
 * Full analysis of a position used by Game Review.
 *
 * Searches every legal root move with a full window so that alternative lines,
 * "only move" detection and centipawn-loss maths all have exact numbers.
 */
export function analyzePosition(fen, iccsList, maxDepth = 4, moveTimeCap = 1200, opts = {}) {
  const lines = opts.lines || 4
  setup(fen, iccsList)
  nodes = 0
  stopped = false
  stopAt = Date.now() + moveTimeCap
  killers = []
  historyHeur.fill(0)

  const legal = []
  for (const mv of generateMoves(BD, TURN)) {
    applyMove(mv)
    const ok = !sideInCheck(BD, TURN ^ 1)
    undoMove(mv)
    if (ok) legal.push({ mv })
  }

  const inCheck = sideInCheck(BD, TURN)
  if (legal.length === 0) {
    return makeAnalysis({
      terminal: true,
      terminalReason: inCheck ? 'checkmate' : 'stalemate',
      winner: TURN ^ 1,
      score: -MATE + 1,
      top: null,
      legalCount: 0
    })
  }
  if (insufficientMaterial(BD)) {
    return makeAnalysis({
      terminal: true,
      terminalReason: 'insufficient',
      winner: null,
      score: 0,
      top: null,
      legalCount: legal.length
    })
  }
  if (opts.repCount >= 3) {
    return makeAnalysis({
      terminal: true,
      terminalReason: 'repetition',
      winner: null,
      score: 0,
      top: null,
      legalCount: legal.length
    })
  }

  TT_KEYS.fill(0)
  let result = null
  let reachedDepth = 0
  for (let d = 1; d <= maxDepth; d++) {
    const res = rootSearch(d, true, result || legal)
    if (stopped) break
    result = res
    reachedDepth = d
    if (Math.abs(result[0].score) > MATE_THRESHOLD) break
  }

  if (!result || !result.length) {
    return makeAnalysis({
      terminal: false,
      score: evaluate(BD, TURN),
      top: null,
      legalCount: legal.length,
      reachedDepth
    })
  }

  const top = result[0]
  const tol = opts.forcedTolerance != null ? opts.forcedTolerance : FORCED_TOLERANCE
  const forcedMoves = result.filter(r => r.score >= top.score - tol).map(r => r.mv)
  // "forced" means there was a real choice but only one move held the position.
  // In a position where everything loses by the same amount nothing is forced.
  const second = result.length > 1 ? result[1].score : -INF
  const uniqueBest = result.length === 1 || top.score - second >= FORCED_GAP
  return makeAnalysis({
    terminal: false,
    score: top.score,
    top,
    legalCount: legal.length,
    forced: forcedMoves.length === 1 && uniqueBest,
    reachedDepth,
    nodes,
    extra: {
      forcedMoves: forcedMoves.slice(0, 8),
      uniqueBest,
      secondBest: result.length > 1 ? result[1].mv : 0,
      inCheck,
      lines: result.slice(0, lines).map(r => ({
        from: r.mv >> 8,
        to: r.mv & 255,
        iccs: mvToIccs(r.mv),
        score: r.score,
        mateIn: mateDistance(r.score),
        pv: r.pv.slice(0, 10).map(mvToIccs)
      }))
    }
  })
}
