import { RED, BLACK, colorOf, typeOf, idx, rowOf, colOf, sqToIccs } from '../engine/board.js'
import { VAL, VAL as VALS } from '../engine/evaluate.js'
import { proxyCp, winPct, outcomeProbs, moveAccuracy, accuracyFromDrop } from './mathUtil.js'
import { identifyOpening } from './openings.js'

/**
 * Move classes, ordered best -> worst, matching the chess.com review vocabulary.
 *
 *   brilliant      only/great move that wins material or is the only defence
 *   great          quiet best move in a sharp position
 *   best           engine's top choice
 *   bestAttempt    not the top choice, but still within the same evaluation
 *   excellent      almost perfect
 *   good           solid
 *   book           still inside the opening book
 *   timeLoss       blunder caused by the clock, not by the move
 *   missedWin      threw away a winning position
 *   missedDraw     let a draw slip
 *   inaccuracy     small but real concession
 *   mistake        gives up material or the advantage
 *   blunder        throws the game away
 */
export const CLASSES = [
  'brilliant', 'great', 'best', 'bestAttempt', 'excellent', 'good', 'book',
  'timeLoss', 'missedWin', 'missedDraw', 'inaccuracy', 'mistake', 'blunder'
]

/** Only the classes chess.com shows as neutral/no-blame. */
export const NEUTRAL_CLASSES = new Set(['brilliant', 'great', 'best', 'bestAttempt', 'excellent', 'good', 'book'])

export const BAD_CLASSES = new Set(['missedWin', 'missedDraw', 'inaccuracy', 'mistake', 'blunder', 'timeLoss'])

export function isBadClass(cls) {
  return BAD_CLASSES.has(cls)
}

/** Centipawn-loss thresholds used for the classic classes. */
const TOL = { excellent: 50, good: 110, inaccuracy: 220, mistake: 420 }

/**
 * A move that hangs material: the cheapest enemy attacker is far cheaper than
 * the piece that was offered. Piece values come straight from the evaluator so
 * the two can never drift apart.
 */
export { VAL as VALS } from '../engine/evaluate.js'

// ---------------------------------------------------------------------------
// Attack helpers (kept local so review never disagrees with the board rules)
// ---------------------------------------------------------------------------

function attackersOf(bd, sq, by) {
  const out = []
  const r0 = rowOf(sq), c0 = colOf(sq)

  const pr = r0 + (by === RED ? 1 : -1)
  if (pr >= 0 && pr < 10) {
    const p = bd[idx(pr, c0)]
    if (p && colorOf(p) === by && typeOf(p) === 7) out.push(VALS[7])
  }
  if (by === RED ? r0 <= 4 : r0 >= 5) {
    for (const dc of [-1, 1]) {
      const cc = c0 + dc
      if (cc < 0 || cc > 8) continue
      const p = bd[idx(r0, cc)]
      if (p && colorOf(p) === by && typeOf(p) === 7) out.push(VALS[7])
    }
  }

  for (const [dr, dc] of [[-2, -1], [-2, 1], [2, -1], [2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2]]) {
    const hr = r0 + dr, hc = c0 + dc
    if (hr < 0 || hr > 9 || hc < 0 || hc > 8) continue
    const p = bd[idx(hr, hc)]
    if (!p || colorOf(p) !== by || typeOf(p) !== 4) continue
    const lr = Math.abs(dr) === 2 ? hr - Math.sign(dr) : hr
    const lc = Math.abs(dc) === 2 ? hc - Math.sign(dc) : hc
    if (!bd[idx(lr, lc)]) out.push(VALS[4])
  }

  for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
    let rr = r0 + dr, cc = c0 + dc, seen = 0
    while (rr >= 0 && rr < 10 && cc >= 0 && cc < 9) {
      const p = bd[idx(rr, cc)]
      if (p) {
        seen++
        if (seen === 1) {
          // a chariot takes what is in front of it; a cannon needs a screen and
          // cannot capture the first piece it meets
          if (colorOf(p) === by && typeOf(p) === 5) out.push(VALS[5])
        } else {
          if (colorOf(p) === by && typeOf(p) === 6) out.push(VALS[6])
          break
        }
      }
      rr += dr; cc += dc
    }
  }

  for (const [dr, dc] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) {
    const ar = r0 + dr, ac = c0 + dc
    const er = r0 + 2 * dr, ec = c0 + 2 * dc
    if (er >= 0 && er < 10 && ec >= 0 && ec < 9 && !bd[idx(ar, ac)]) {
      const ep = bd[idx(er, ec)]
      if (ep && colorOf(ep) === by && typeOf(ep) === 3 && (by === RED ? er >= 5 : er <= 4)) {
        out.push(VALS[3])
      }
    }
  }
  return out
}

/** Cheapest enemy attacker of `sq`, or Infinity when nothing attacks it. */
export function minAttackerValue(bd, sq, by) {
  const list = attackersOf(bd, sq, by)
  return list.length ? Math.min(...list) : Infinity
}

/** Total enemy attack value aimed at `sq`. */
export function attackPressure(bd, sq, by) {
  return attackersOf(bd, sq, by).reduce((a, b) => a + b, 0)
}

/**
 * Classify what kind of material was offered.
 *   'exchange'  rook offered for a cannon or less
 *   'offensive' heavy piece or horse given for a pawn/light piece
 *   'positional' minor piece given for equal material
 *   null        no real sacrifice
 */
export function sacrificeKind(bdAfter, to, mover) {
  const movedPc = bdAfter[to]
  if (!movedPc) return null
  const movedVal = VALS[typeOf(movedPc)]
  if (movedVal < 400) return null
  const attack = attackersOf(bdAfter, to, mover ^ 1)
  if (!attack.length) return null
  const cheapest = Math.min(...attack)
  const defence = attackersOf(bdAfter, to, mover)
  const bestDefence = defence.length ? Math.max(...defence) : 0

  // A trade (attacker gets something back) is not a sacrifice.
  if (bestDefence >= cheapest) return null
  if (cheapest + 100 >= movedVal) return null

  const gap = movedVal - cheapest
  if (movedVal >= 900 && cheapest <= 450) return gap >= 300 ? 'exchange' : 'offensive'
  if (movedVal >= 900 || gap >= 200) return 'offensive'
  return 'positional'
}

/** How badly the side's palace is exposed to enemy heavy pieces. */
function palaceHeat(bd, side) {
  let heat = 0
  const opp = side ^ 1
  for (let i = 0; i < 90; i++) {
    const p = bd[i]
    if (!p || colorOf(p) !== opp) continue
    const t = typeOf(p)
    if (t !== 5 && t !== 6) continue
    const r = rowOf(i), c = colOf(i)
    if (c < 2 || c > 6) continue
    if (side === RED ? r >= 5 : r <= 4) continue
    heat += t === 5 ? 3 : 2
  }
  return heat
}

// ---------------------------------------------------------------------------
// Phases
// ---------------------------------------------------------------------------

export function materialOf(bd) {
  let n = 0
  for (let i = 0; i < 90; i++) {
    const p = bd[i]
    if (!p) continue
    const t = typeOf(p)
    // generals are not material — skip them so thresholds are comparable
    if (t >= 2 && t <= 7) n += VAL[t]
  }
  return n
}

/** Opening / middlegame / endgame, used for per-phase accuracy and graphs. */
export function phaseOf(ply, bd) {
  const mat = materialOf(bd)
  if (mat <= 2400) return 'endgame'
  if (ply < 24 && mat > 6200) return 'opening'
  return 'middlegame'
}

// ---------------------------------------------------------------------------
// Move classification
// ---------------------------------------------------------------------------

export function classifyLoss(loss, opts = {}) {
  const { bestMatch = false, forced = false, onlyMove = false, sacrifice = null, timeTrouble = false, missedWin = false, missedDraw = false, missedMate = false, book = false } = opts

  if (book) return 'book'
  if (missedMate) return timeTrouble ? 'timeLoss' : 'blunder'
  if (missedWin) return 'missedWin'
  if (missedDraw) return 'missedDraw'

  if (forced || onlyMove) {
    if (sacrifice && loss <= 30) return 'brilliant'
    return 'best'
  }

  if (loss <= 20) {
    if (sacrifice) return 'brilliant'
    // an engine tie-break difference is not worth flagging
    if (bestMatch || loss <= 5) return 'best'
    return 'bestAttempt'
  }
  if (loss <= TOL.excellent) return 'excellent'
  if (loss <= TOL.good) return 'good'
  if (loss <= TOL.inaccuracy) return 'inaccuracy'
  if (loss <= TOL.mistake) return timeTrouble ? 'timeLoss' : 'mistake'
  return timeTrouble ? 'timeLoss' : 'blunder'
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

function emptyCounts() {
  const c = {}
  for (const k of CLASSES) c[k] = 0
  return c
}

function accuracyForColor(moves) {
  if (!moves.length) return 100
  return Math.round((moves.reduce((s, m) => s + m.accuracy, 0) / moves.length) * 10) / 10
}

function summarizeSide(plies, color) {
  const moves = plies.filter(p => p.mover === color)
  const counts = emptyCounts()
  let acpl = 0
  for (const m of moves) {
    counts[m.cls]++
    acpl += m.acpl
  }
  const phases = {}
  for (const ph of ['opening', 'middlegame', 'endgame']) {
    const inPhase = moves.filter(m => m.phase === ph)
    phases[ph] = {
      accuracy: accuracyForColor(inPhase),
      moves: inPhase.length,
      acpl: inPhase.length ? Math.round(inPhase.reduce((s, m) => s + m.acpl, 0) / inPhase.length) : 0
    }
  }
  // Average expected result over the whole game: an honest 0-100 win/draw/loss
  // split, rather than an evaluation-weighted blend that does not add up.
  const outcome = {
    win: moves.length ? moves.reduce((s, m) => s + m.prob.after.win, 0) / moves.length : 0.5,
    draw: moves.length ? moves.reduce((s, m) => s + m.prob.after.draw, 0) / moves.length : 0.5,
    loss: moves.length ? moves.reduce((s, m) => s + m.prob.after.loss, 0) / moves.length : 0
  }
  const weightedOutcome = {
    win: Math.round(outcome.win * 100),
    draw: Math.round(outcome.draw * 100),
    loss: Math.round(outcome.loss * 100)
  }
  // final expectation after this side's last move
  const last = moves.length ? moves[moves.length - 1] : null
  return {
    accuracy: accuracyForColor(moves),
    acpl: moves.length ? Math.round(acpl / moves.length) : 0,
    counts,
    moves: moves.length,
    brilliant: counts.brilliant + counts.great,
    blunders: counts.blunder + counts.missedWin + counts.timeLoss,
    missedWins: counts.missedWin,
    missedDraws: counts.missedDraw,
    finalWinPct: Math.round(100 * (last ? last.prob.after.win : 0.5)),
    weightedOutcome,
    phases
  }
}

/**
 * Turn raw engine output into a full chess.com-style report.
 *
 * @param {string}   startFen
 * @param {object[]} positions annotated positions from annotatedReplay()
 * @param {object[]} posResults one analyzePosition() result per position
 * @param {string[][]} lessonSeqs opening-book lines used to tag `book` moves
 * @param {object}   meta  { humanColor, result, reason, name, timeTroublePly }
 */
export function buildReview(startFen, positions, posResults, lessonSeqs = [], meta = {}) {
  // Only trust a contiguous prefix of finished engine results. Missing
  // positions must not silently become "evaluation 0", which would turn the
  // whole review into nonsense.
  let analysed = 0
  while (analysed < posResults.length && posResults[analysed]) analysed++
  const posList = positions.slice(0, Math.max(1, analysed))
  const resList = posResults.slice(0, posList.length)

  const N = Math.max(0, posList.length - 1)
  const humanColor = meta.humanColor === BLACK ? BLACK : RED

  // ---- opening-book detection -------------------------------------------------
  const bookAt = new Array(N).fill(false)
  for (const seq of lessonSeqs || []) {
    if (!seq || seq.length < 2) continue
    for (let i = 0; i < Math.min(N, seq.length); i++) {
      let ok = true
      for (let k = 0; k <= i; k++) if (seq[k] !== posList[k + 1].iccs) { ok = false; break }
      if (ok) bookAt[i] = true
    }
  }

  const res = j => (resList && resList[j]) || null
  const sign = c => (c === RED ? 1 : -1)

  // ---- evaluation graph, all from Red's point of view ------------------------
  // graph      what actually happened
  // graphBest  what the evaluation would have been had the best move been played
  // graphMate  signed mate distance per position (0 when no mate is on the board)
  const graph = []
  const graphMate = []
  const graphBest = []
  const cpOf = (r, sideToMove) => {
    if (!r) return 0
    if (r.terminal && r.terminalReason === 'insufficient') return 0
    return sign(sideToMove) * proxyCp(r.score)
  }
  for (let j = 0; j <= N; j++) {
    const r = res(j)
    const side = posList[j].turn
    graph.push(cpOf(r, side))
    graphMate.push(r && r.mateIn ? sign(side) * r.mateIn : 0)
    if (j === 0) {
      graphBest.push(graph[0])
    } else {
      const prev = res(j - 1)
      graphBest.push(prev ? sign(posList[j - 1].turn) * proxyCp(prev.score) : graph[j])
    }
  }
  graphBest[N] = graph[N]

  // ---- per-ply ---------------------------------------------------------------
  const plies = []
  const timeTroublePly = meta.timeTroublePly

  for (let i = 0; i < N; i++) {
    const before = res(i)
    const after = res(i + 1)
    const pos = posList[i + 1]
    const mover = pos.move ? pos.move.mover : RED
    const s = sign(mover)
    const bdBefore = posList[i].bd
    const bdAfter = pos.bd

    const bestMover = before ? before.score : 0
    const playedMover = after ? -after.score : 0
    const hadMate = s * bestMover > 90000
    const keptMate = s * playedMover > 90000

    let loss = Math.max(0, proxyCp(bestMover) - proxyCp(playedMover))
    if (hadMate && keptMate) loss = 0
    else if (hadMate) loss = 800

    const bestMatch = !!(before && !before.terminal &&
      pos.lastFrom === before.bestFrom && pos.lastTo === before.bestTo)
    const onlyMove = !!(before && before.onlyMove)
    const forced = !!(before && before.forced)

    const sacrifice = sacrificeKind(bdAfter, pos.lastTo, mover)
    const missedMate = hadMate && !keptMate
    // A move only counts as a book move while it is still sane. Following the
    // book straight into a losing position is a blunder, not theory.
    const isBook = !!bookAt[i] && loss <= TOL.good && !missedMate

    // missed win / missed draw from the win-draw-loss model
    const probBefore = outcomeProbs(s * bestMover)
    const probAfter = outcomeProbs(s * playedMover)
    const missedWin = !isBook && !bestMatch &&
      probBefore.win >= 0.78 && probAfter.win <= 0.35 && loss >= 200
    const missedDraw = !isBook && !bestMatch && !missedWin && loss >= 120 &&
      probBefore.draw >= 0.55 && probAfter.loss >= 0.55

    const cls = classifyLoss(loss, {
      bestMatch, forced, onlyMove, sacrifice, book: isBook,
      missedWin, missedDraw, missedMate,
      timeTrouble: typeof timeTroublePly === 'number' && i === timeTroublePly
    })

    const winBefore = winPct(Math.max(-1500, Math.min(1500, bestMover)))
    const winAfter = winPct(Math.max(-1500, Math.min(1500, playedMover)))
    const phase = phaseOf(i, bdAfter)
    const accuracy = moveAccuracy(winBefore, winAfter, phase)

    // why is this move bad?  the most useful thing in a review.
    const reason = explainMove({
      cls, loss, bestMatch, onlyMove, forced, missedMate, missedWin, missedDraw,
      mover, bdBefore, bdAfter, before, after, sacrifice
    })

    // evaluation lost by playing this move instead of the best one, red's view
    const swing = graphBest[i] - graph[i + 1]

    plies.push({
      plyIndex: i,
      mover,
      iccs: pos.iccs,
      chinese: pos.chinese,
      capture: pos.capture,
      checkSq: pos.checkSq,
      cls,
      loss: Math.round(loss),
      acpl: Math.round(loss),
      accuracy: Math.round(accuracy * 10) / 10,
      phase,
      reason,
      reasonKey: reason ? reason.key : null,
      missedMate,
      missedWin,
      missedDraw,
      book: isBook,
      sacrifice: sacrifice || null,
      onlyMove,
      forced,
      bestMatch,
      bestFrom: before ? before.bestFrom : -1,
      bestTo: before ? before.bestTo : -1,
      bestIccs: before && before.bestFrom >= 0
        ? sqToIccs(before.bestFrom) + sqToIccs(before.bestTo) : null,
      alternatives: before && before.lines ? before.lines.slice(1, 4) : [],
      pv: before ? before.pv : [],
      mateBefore: s * bestMover > 90000 ? (before.mateIn || 1) : 0,
      mateAfter: s * playedMover > 90000 ? -(after?.mateIn || 1) : 0,
      winPctBefore: Math.round(winBefore),
      winPctAfter: Math.round(winAfter),
      winPct: Math.round((winBefore + winAfter) / 2),
      prob: { before: probBefore, after: probAfter },
      swing: Math.round(swing),
      swings: { favor: swing >= 0 ? swing : 0, against: swing < 0 ? -swing : 0 },
      evalRedBefore: graph[i],
      evalRedAfter: graph[i + 1],
      kingHeat: { before: palaceHeat(bdBefore, mover), after: palaceHeat(bdAfter, mover ^ 1) }
    })
  }

  // ---- summaries -------------------------------------------------------------
  const summary = {
    red: summarizeSide(plies, RED),
    black: summarizeSide(plies, BLACK)
  }

  const keyMoments = buildKeyMoments(plies, N)
  const opening = identifyOpening(
    positions.slice(1).map(p => p.iccs), humanColor
  )

  const mine = plies.filter(p => p.mover === humanColor)
  const theirs = plies.filter(p => p.mover !== humanColor)
  const worst = plies.reduce((b, p) => (!b || p.acpl > b.acpl ? p : b), null)
  const bestPly = plies.reduce((b, p) => (!b || p.acpl < b.acpl ? p : b), null)
  const bestBrilliant = plies.find(p => p.cls === 'brilliant') || null

  const report = {
    opening,
    humanColor,
    result: meta.result || null,
    reason: meta.reason || null,
    playerName: meta.name || null,
    opponentName: meta.oppName || null,
    totalPlies: N,
    worstPly: worst ? worst.plyIndex : null,
    bestPly: bestPly ? bestPly.plyIndex : null,
    brilliantPly: bestBrilliant ? bestBrilliant.plyIndex : null,
    keyMoments,
    missedWins: plies.filter(p => p.missedWin).length,
    missedDraws: plies.filter(p => p.missedDraw).length,
    missedMates: plies.filter(p => p.missedMate).length,
    blunders: summary.red.blunders + summary.black.blunders,
    mistakes: summary.red.counts.mistake + summary.black.counts.mistake,
    lowAccuracyPlies: plies.filter(p => p.accuracy < 70 && !NEUTRAL_CLASSES.has(p.cls)).map(p => p.plyIndex),
    // chess.com flags the weaker player's best moment
    lowerRatedSide: (summary.red.accuracy <= summary.black.accuracy) ? RED : BLACK,
    lowerRatedBest: (() => {
      const side = summary.red.accuracy <= summary.black.accuracy ? mine : theirs
      if (!side.length) return null
      return side.reduce((b, p) => (!b || p.acpl < b.acpl ? p : b), null)
    })(),
    biggestSwing: keyMoments.reduce((b, k) => (!b || Math.abs(k.swing) > Math.abs(b.swing) ? k : b), null)
  }

  return {
    plies,
    graph,
    graphMate,
    graphBest,
    summary,
    report,
    mine: mine.map(p => p.plyIndex),
    theirs: theirs.map(p => p.plyIndex)
  }
}

function buildKeyMoments(plies, N) {
  const candidates = []
  for (const p of plies) {
    let weight = p.acpl
    if (p.cls === 'brilliant') weight += 400
    if (p.cls === 'blunder' || p.missedWin) weight += 250
    if (p.missedMate) weight += 400
    if (p.missedDraw) weight += 150
    if (p.bestMatch && p.sacrifice) weight += 200
    if (weight > 90) candidates.push({ plyIndex: p.plyIndex, cls: p.cls, swing: p.swing, acpl: p.acpl, weight })
  }
  return candidates
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 8)
    .sort((a, b) => a.plyIndex - b.plyIndex)
}

/**
 * Short, human-readable diagnosis of a single move — this is what turns a
 * review into something you can actually learn from.
 */
export function explainMove(ctx) {
  const {
    cls, loss, bestMatch, onlyMove, forced, missedMate, missedWin, missedDraw,
    mover, bdBefore, bdAfter, before, after, sacrifice
  } = ctx

  if (cls === 'brilliant') {
    if (onlyMove || forced) {
      return {
        key: 'brilliantOnly',
        en: 'Only move — and it is a sacrifice! Brilliant.',
        zh: '唯一著法，而且是一記棄子！妙極。'
      }
    }
    return {
      key: 'brilliantSac',
      en: `Brilliant ${sacrifice} sacrifice that keeps the initiative.`,
      zh: `精妙的${sacrifice === 'exchange' ? '兌子' : '棄子'}，攻勢不輟，妙手！`
    }
  }
  if (cls === 'best' || cls === 'great' || cls === 'bestAttempt') {
    if (bestMatch && (onlyMove || forced)) {
      return { key: 'forcedBest', en: 'The only move that holds — found it.', zh: '唯一能守住的著法，你找到了。' }
    }
    return { key: 'best', en: 'Engine best move.', zh: '引擎最佳著法。' }
  }
  if (cls === 'book') return { key: 'book', en: 'Opening theory.', zh: '開局定式。' }
  if (cls === 'excellent' || cls === 'good') return null

  if (missedMate) {
    return { key: 'missedMate', en: 'Missed a forced mate.', zh: '錯過了殺棋。' }
  }
  if (missedWin) {
    return { key: 'missedWin', en: 'Missed a winning continuation and let the advantage slip.', zh: '錯過勝機，讓優勢流失。' }
  }
  if (missedDraw) {
    return { key: 'missedDraw', en: 'Missed the draw — the position was still holdable.', zh: '錯過和棋，本來還能守。' }
  }

  const opp = mover ^ 1
  const oppBestCp = after && after.score != null ? -proxyCp(after.score) : 0
  if (oppBestCp >= 350) {
    return { key: 'bigConcession', en: 'Gave back the advantage — the opponent had a big winning continuation.', zh: '送出巨大優勢——對方有明顯的取勝變化。' }
  }
  if (oppBestCp >= 150) {
    return { key: 'concession', en: 'Allowed a solid advantage to the opponent.', zh: '讓對方取得明顯優勢。' }
  }

  if (hasWinningCapture(bdBefore, mover, before)) {
    return { key: 'missedCapture', en: 'Missed a free capture.', zh: '漏吃了子。' }
  }

  const heatBefore = palaceHeat(bdBefore, mover)
  const heatAfter = palaceHeat(bdAfter, opp)
  if (heatAfter - heatBefore >= 4) {
    return { key: 'openedKing', en: 'Let enemy heavy pieces into the palace.', zh: '讓對方重子殺入九宮。' }
  }

  if (loss >= 420) {
    return { key: 'throwsGame', en: 'Loses material outright.', zh: '直接丟子。' }
  }
  if (loss >= 200) {
    return { key: 'inaccuracyReason', en: 'Inaccurate — gives away the initiative.', zh: '不精確——先手盡失。' }
  }
  if (onlyMove || forced) return null
  return { key: 'imprecise', en: 'Imprecise — a better move existed.', zh: '不夠精確，有更好的著法。' }
}

/** Was a capture available (and worth taking) before the move was played? */
function hasWinningCapture(bd, mover, before) {
  const top = before && before.lines && before.lines[0]
  if (!top || !top.iccs) return false
  const from = (top.iccs.charCodeAt(0) - 97) + (9 - (top.iccs.charCodeAt(1) - 48)) * 9
  const to = (top.iccs.charCodeAt(2) - 97) + (9 - (top.iccs.charCodeAt(3) - 48)) * 9
  const victim = bd[to]
  if (!victim || colorOf(victim) === mover) return false
  return VALS[typeOf(victim)] >= 120
}

// ---------------------------------------------------------------------------
// Aggregate helpers used by the Progress page
// ---------------------------------------------------------------------------

export function aggregateReviews(reviews) {
  const acc = []
  const counts = emptyCounts()
  let plies = 0
  let acpl = 0
  let bril = 0
  for (const r of reviews) {
    if (!r) continue
    acc.push({
      ts: r.ts || 0,
      accuracy: Math.round((r.summary.red.accuracy + r.summary.black.accuracy) / 2),
      mine: r.summary.red.accuracy,
      theirs: r.summary.black.accuracy
    })
    for (const p of r.plies) {
      counts[p.cls]++
      plies++
      acpl += p.acpl
      if (p.cls === 'brilliant') bril++
    }
  }
  return {
    reviews: reviews.length,
    plies,
    acpl: plies ? Math.round(acpl / plies) : 0,
    counts,
    brilliant: bril,
    history: acc.sort((a, b) => a.ts - b.ts)
  }
}

export { accuracyFromDrop }
