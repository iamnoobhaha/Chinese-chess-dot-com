export class EngineClient {
  constructor() {
    this.worker = null
    this.seq = 0
    this.pending = new Map()
    this.progressHandlers = new Map()
    this.resultHandlers = new Map()
  }

  ensure() {
    if (this.worker) return
    this.worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' })
    this.worker.onmessage = ({ data: d }) => {
      const entry = this.pending.get(d.jobId)
      if (d.type === 'progress') {
        const ph = this.progressHandlers.get(d.jobId)
        if (ph) ph(d.index, d.total, d.phase)
        // partial results let the UI fill in while the engine keeps working
        const rh = this.resultHandlers.get(d.jobId)
        const entry = this.pending.get(d.jobId)
        if (rh && d.result && entry && entry.partial) {
          entry.partial[d.index] = d.result
          rh(entry.partial.slice())
        }
        return
      }
      if (!entry) return
      this.pending.delete(d.jobId)
      this.progressHandlers.delete(d.jobId)
      this.resultHandlers.delete(d.jobId)
      if (d.type === 'error') entry.reject(new Error(d.message))
      else entry.resolve(d)
    }
    this.worker.onerror = e => {
      const err = new Error(e.message || 'worker error')
      for (const [, entry] of this.pending) entry.reject(err)
      this.pending.clear()
      this.progressHandlers.clear()
      this.resultHandlers.clear()
      this.worker = null
    }
  }

  _post(type, payload, onProgress, onPartial) {
    this.ensure()
    const jobId = ++this.seq
    const partial = onPartial ? [] : null
    return new Promise((resolve, reject) => {
      this.pending.set(jobId, { resolve, reject, partial })
      if (onProgress) this.progressHandlers.set(jobId, onProgress)
      if (onPartial) this.resultHandlers.set(jobId, onPartial)
      this.worker.postMessage({ jobId, type, ...payload })
    })
  }

  go({ fen, moves, level }) {
    return this._post('go', { fen, moves, level })
  }

  hint({ fen, moves }) {
    return this._post('hint', { fen, moves })
  }

  /** Instant "how bad was that move?" probe used by the in-game coach. */
  check({ fen, moves }) {
    return this._post('check', { fen, moves })
  }

  analyze({ fen, moves, depth, moveTimeCap, humanColor, repCounts }, onProgress, onPartial) {
    return this._post(
      'analyze',
      { fen, moves, depth, moveTimeCap, humanColor, repCounts },
      onProgress,
      onPartial
    )
  }

  cancel() {
    if (!this.worker) {
      const err = new Error('cancelled')
      for (const [, entry] of this.pending) entry.reject(err)
      this.pending.clear()
      this.progressHandlers.clear()
      this.resultHandlers.clear()
      return
    }
    this.worker.terminate()
    this.worker = null
    const err = new Error('cancelled')
    for (const [, entry] of this.pending) entry.reject(err)
    this.pending.clear()
    this.progressHandlers.clear()
    this.resultHandlers.clear()
  }
}

export const engine = new EngineClient()