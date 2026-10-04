import { think, analyzePosition } from './search.js'

/**
 * Worker protocol
 *   go       -> bestmove            (play against the AI)
 *   hint     -> hint                (on-demand hint / teaching arrow)
 *   check    -> check               (blunder warning for the move just played)
 *   analyze  -> progress* / reviewDone  (full Game Review pass)
 */
self.onmessage = ({ data: d }) => {
  try {
    if (d.type === 'go') {
      const r = think(d.fen, d.moves || [], d.level || 4)
      self.postMessage({
        jobId: d.jobId,
        type: 'bestmove',
        moveIccs: r ? r.moveIccs : null,
        score: r ? r.score : 0,
        pv: r ? r.pv : [],
        nodes: r ? r.nodes : 0
      })
    } else if (d.type === 'hint') {
      const r = analyzePosition(d.fen, d.moves || [], d.depth || 5, d.moveTimeCap || 900)
      self.postMessage({
        jobId: d.jobId,
        type: 'hint',
        bestFrom: r.bestFrom,
        bestTo: r.bestTo,
        score: Math.max(-1500, Math.min(1500, r.score)),
        mateIn: r.mateIn,
        terminal: !!r.terminal
      })
    } else if (d.type === 'check') {
      // fast "was that a blunder?" probe: evaluate the position before and
      // after the player's move and report the centipawn loss.
      const moves = d.moves || []
      const before = analyzePosition(d.fen, moves, d.depth || 4, d.moveTimeCap || 500, { lines: 2 })
      const after = analyzePosition(d.fen, moves, d.depth || 4, d.moveTimeCap || 500, { lines: 1 })
      const cpBefore = Math.max(-1500, Math.min(1500, before.score))
      const cpAfter = Math.max(-1500, Math.min(1500, -after.score))
      self.postMessage({
        jobId: d.jobId,
        type: 'check',
        loss: Math.max(0, Math.round(cpBefore - cpAfter)),
        bestFrom: before.bestFrom,
        bestTo: before.bestTo,
        bestIccs: before.bestFrom >= 0
          ? iccs(before.bestFrom) + iccs(before.bestTo) : null,
        mateMissed: before.mateIn > 0 && !(after.mateIn < 0),
        mateForced: after.mateIn < 0
      })
    } else if (d.type === 'analyze') {
      const moves = d.moves || []
      const total = moves.length + 1
      const results = new Array(total).fill(null)
      const depth = d.depth || 4
      const cap = d.moveTimeCap || 1200
      const done = new Set()

      const runOne = j => {
        results[j] = analyzePosition(d.fen, moves.slice(0, j), depth, cap, {
          repCount: d.repCounts ? d.repCounts[j] : 0
        })
        done.add(j)
        // stream each finished position so the UI can build the review early
        self.postMessage({ jobId: d.jobId, type: 'progress', index: j, total, result: results[j] })
      }

      // The final position is the cheapest to evaluate and tells us how the
      // game ended, so do it first.
      runOne(total - 1)

      // Search the human's own moves first so the review becomes useful early.
      // Every position must be analysed — a decided final position is not a
      // reason to skip the rest of the game.
      const human = d.humanColor === 1 ? 1 : 0
      const order = []
      for (let j = 0; j < total; j++) {
        const side = j % 2 === 0 ? 0 : 1
        order.push([side === human ? 0 : 1, j])
      }
      order.sort((a, b) => a[0] - b[0] || a[1] - b[1])
      for (const [, j] of order) {
        if (j === total - 1 || done.has(j)) continue
        runOne(j)
      }

      self.postMessage({ jobId: d.jobId, type: 'reviewDone', results })
    }
  } catch (err) {
    self.postMessage({ jobId: d.jobId, type: 'error', message: String(err && err.stack || err) })
  }
}

function iccs(sq) {
  return String.fromCharCode(97 + (sq % 9)) + String.fromCharCode(48 + 9 - ((sq / 9) | 0))
}