import { RED, colorOf, typeOf } from '../engine/board.js'
import { proxyCp, winPct } from './mathUtil.js'

export const CLASSES = ['brilliant', 'best', 'excellent', 'good', 'book', 'inaccuracy', 'mistake', 'blunder']

export function classifyLoss(loss, { bestMatch = false, forced = false, brilliant = false }) {
  if (forced) return brilliant ? 'brilliant' : 'best'
  let cls
  if (bestMatch || loss <= 20) cls = 'best'
  else if (loss <= 50) cls = 'excellent'
  else if (loss <= 110) cls = 'good'
  else if (loss <= 220) cls = 'inaccuracy'
  else if (loss <= 420) cls = 'mistake'
  else cls = 'blunder'
  if (brilliant && (cls === 'best' || cls === 'excellent')) return 'brilliant'
  return cls
}

function moveAccuracy(winBefore, winAfter) {
  const drop = Math.max(0, winBefore - winAfter)
  const acc = 103.1668 * Math.exp(-0.04354 * drop) - 3.1669
  return Math.max(0, Math.min(100, acc))
}

const VALS = [0, 6000, 120, 120, 400, 900, 450, 30]

function minAttackerValue(bd, sq, by) {
  let bestVal = Infinity
  const r0 = (sq / 9) | 0, c0 = sq % 9

  const pr = r0 + (by === RED ? 1 : -1)
  if (pr >= 0 && pr < 10) {
    const p = bd[pr * 9 + c0]
    if (p && colorOf(p) === by && typeOf(p) === 7) bestVal = Math.min(bestVal, VALS[7])
  }
  for (const dc of [-1, 1]) {
    const cc = c0 + dc
    if (cc < 0 || cc > 8) continue
    const p = bd[r0 * 9 + cc]
    if (p && colorOf(p) === by && typeOf(p) === 7) {
      const crossed = by === RED ? r0 <= 4 : r0 >= 5
      if (crossed) bestVal = Math.min(bestVal, VALS[7])
    }
  }

  for (const [dr, dc] of [[-2, -1], [-2, 1], [2, -1], [2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2]]) {
    const hr = r0 + dr, hc = c0 + dc
    if (hr < 0 || hr > 9 || hc < 0 || hc > 8) continue
    const p = bd[hr * 9 + hc]
    if (!p || colorOf(p) !== by || typeOf(p) !== 4) continue
    const lr = Math.abs(dr) === 2 ? hr - Math.sign(dr) : hr
    const lc = Math.abs(dc) === 2 ? hc - Math.sign(dc) : hc
    if (!bd[lr * 9 + lc]) bestVal = Math.min(bestVal, VALS[4])
  }

  for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
    let rr = r0 + dr, cc = c0 + dc, seen = false
    while (rr >= 0 && rr < 10 && cc >= 0 && cc < 9) {
      const p = bd[rr * 9 + cc]
      if (p) {
        if (!seen) {
          if (colorOf(p) === by && typeOf(p) === 5) bestVal = Math.min(bestVal, VALS[5])
          seen = true
        } else {
          if (colorOf(p) === by && typeOf(p) === 6) bestVal = Math.min(bestVal, VALS[6])
          break
        }
      }
      rr += dr; cc += dc
    }
  }

  for (const [dr, dc] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) {
    const ar = r0 + dr, ac = c0 + dc
    const er = r0 + 2 * dr, ec = c0 + 2 * dc
    if (er >= 0 && er < 10 && ec >= 0 && ec < 9) {
      const ep = bd[er * 9 + ec]
      if (ep && colorOf(ep) === by && typeOf(ep) === 3 && ar >= 0 && ar < 10 && ac >= 0 && ac < 9 && !bd[ar * 9 + ac]) {
        const okSide = by === RED ? r0 >= 5 : r0 <= 4
        if (okSide) bestVal = Math.min(bestVal, VALS[3])
      }
    }
  }
  return bestVal
}

function isSacrifice(bdAfter, to, mover) {
  const movedPc = bdAfter[to]
  if (!movedPc) return false
  const movedVal = VALS[typeOf(movedPc)]
  if (movedVal < 400) return false
  const attackerVal = minAttackerValue(bdAfter, to, mover ^ 1)
  if (attackerVal === Infinity) return false
  return attackerVal + 80 < movedVal
}

export function buildReview(startFen, positions, posResults, lessonSeqs = []) {
  const N = positions.length - 1

  const seqAtPly = []
  if (lessonSeqs.length) {
    for (let i = 0; i < N; i++) {
      let any = false
      for (const seq of lessonSeqs) {
        if (seq.length <= i) continue
        let ok = true
        for (let k = 0; k <= i; k++) {
          if (seq[k] !== positions[k + 1].iccs) { ok = false; break }
        }
        if (ok) { any = true; break }
      }
      seqAtPly.push(any)
    }
  }

  const graph = []
  for (let j = 0; j <= N; j++) {
    const res = posResults[j]
    const turnSign = positions[j].turn === RED ? 1 : -1
    graph.push(res ? turnSign * proxyCp(res.score) : 0)
  }

  const plies = []
  for (let i = 0; i < N; i++) {
    const before = posResults[i]
    const after = posResults[i + 1]
    const pos = positions[i + 1]
    const mover = colorOf(pos.move.piece)
    const sign = mover === RED ? 1 : -1

    const bestMover = before ? before.score : 0
    const playedMover = after ? -after.score : 0

    const hadMate = sign * bestMover > 90000
    const keptMate = sign * playedMover > 90000
    let loss = Math.max(0, proxyCp(bestMover) - proxyCp(playedMover))
    if (hadMate && keptMate) loss = 0
    else if (hadMate) loss = 800

    const forced = !!(before && before.onlyMove)
    const bestMatch = !!(before && pos.lastFrom === before.bestFrom && pos.lastTo === before.bestTo)
    const sacrifice = !!(before && bestMatch && isSacrifice(pos.bd, pos.lastTo, mover))
    const book = !!seqAtPly[i]

    const cls = classifyLoss(loss, { bestMatch, forced, brilliant: sacrifice })

    const wb = winPct(Math.max(-1500, Math.min(1500, bestMover)))
    const wa = winPct(Math.max(-1500, Math.min(1500, playedMover)))
    const accuracy = moveAccuracy(wb, wa)

    plies.push({
      plyIndex: i,
      mover,
      iccs: pos.iccs,
      chinese: pos.chinese,
      capture: pos.capture,
      checkSq: pos.checkSq,
      cls,
      loss: Math.round(loss),
      accuracy: Math.round(accuracy * 10) / 10,
      bestFrom: before ? before.bestFrom : -1,
      bestTo: before ? before.bestTo : -1,
      pv: before ? before.pv : [],
      evalRedAfter: graph[i + 1]
    })
  }

  const summary = {}
  for (const color of [RED, RED ^ 1]) {
    const moves = plies.filter(p => p.mover === color)
    const acc = moves.length ? moves.reduce((s, m) => s + m.accuracy, 0) / moves.length : 100
    const counts = { brilliant: 0, best: 0, excellent: 0, good: 0, book: 0, inaccuracy: 0, mistake: 0, blunder: 0 }
    for (const m of moves) counts[m.cls]++
    summary[color === RED ? 'red' : 'black'] = {
      accuracy: Math.round(acc * 10) / 10,
      counts,
      moves: moves.length
    }
  }

  return { plies, graph, summary }
}
