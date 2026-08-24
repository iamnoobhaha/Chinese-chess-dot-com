export class EngineClient {
  constructor() {
    this.worker = null
    this.seq = 0
    this.pending = new Map()
    this.progressHandlers = new Map()
  }

  ensure() {
    if (this.worker) return
    this.worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' })
    this.worker.onmessage = ({ data: d }) => {
      const entry = this.pending.get(d.jobId)
      if (!entry) return
      if (d.type === 'progress') {
        const ph = this.progressHandlers.get(d.jobId)
        if (ph) ph(d.index, d.total)
        return
      }
      this.pending.delete(d.jobId)
      this.progressHandlers.delete(d.jobId)
      if (d.type === 'error') entry.reject(new Error(d.message))
      else entry.resolve(d)
    }
    this.worker.onerror = e => {
      for (const [, entry] of this.pending) entry.reject(new Error(e.message || 'worker error'))
      this.pending.clear()
    }
  }

  _post(type, payload, onProgress) {
    this.ensure()
    const jobId = ++this.seq
    return new Promise((resolve, reject) => {
      this.pending.set(jobId, { resolve, reject })
      if (onProgress) this.progressHandlers.set(jobId, onProgress)
      this.worker.postMessage({ jobId, type, ...payload })
    })
  }

  go({ fen, moves, level }) {
    return this._post('go', { fen, moves, level })
  }

  hint({ fen, moves }) {
    return this._post('hint', { fen, moves })
  }

  analyze({ fen, moves, depth, moveTimeCap }, onProgress) {
    return this._post('analyze', { fen, moves, depth, moveTimeCap }, onProgress)
  }

  cancel() {
    if (!this.worker) return
    this.worker.terminate()
    this.worker = null
    for (const [, entry] of this.pending) entry.reject(new Error('cancelled'))
    this.pending.clear()
    this.progressHandlers.clear()
  }
}

export const engine = new EngineClient()
