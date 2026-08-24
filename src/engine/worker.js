import { think, analyzePosition } from './search.js'

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
      const r = analyzePosition(d.fen, d.moves || [], 4, 900)
      self.postMessage({
        jobId: d.jobId,
        type: 'hint',
        bestFrom: r.bestFrom,
        bestTo: r.bestTo,
        score: Math.max(-1500, Math.min(1500, r.score)),
        terminal: !!r.terminal
      })
    } else if (d.type === 'analyze') {
      const moves = d.moves || []
      const results = []
      for (let j = 0; j <= moves.length; j++) {
        const r = analyzePosition(d.fen, moves.slice(0, j), d.depth || 4, d.moveTimeCap || 1200)
        results.push(r)
        self.postMessage({ jobId: d.jobId, type: 'progress', index: j, total: moves.length + 1 })
      }
      self.postMessage({ jobId: d.jobId, type: 'reviewDone', results })
    }
  } catch (err) {
    self.postMessage({ jobId: d.jobId, type: 'error', message: String(err && err.stack || err) })
  }
}
